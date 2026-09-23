import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { NotGroupMemberError, resolveSelectedGroup, selectGroup } from "@/lib/groups";
import { joinGroupByToken } from "@/lib/invites";

// FR-026〜FR-029 / data-model.md「User（変更）」: 選択中グループの解決
describe("resolveSelectedGroup", () => {
  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];

  async function makeUser(suffix: string) {
    const user = await prisma.user.create({
      data: {
        email: `selected-${suffix}-${Date.now()}-${Math.random()}@example.com`,
        passwordHash: "test-hash",
        displayName: `Test ${suffix}`,
      },
    });
    createdUserIds.push(user.id);
    return user;
  }

  async function makeGroup(name: string) {
    const group = await prisma.group.create({ data: { name } });
    createdGroupIds.push(group.id);
    return group;
  }

  async function join(userId: string, groupId: string, joinedAt: Date) {
    await prisma.groupMember.create({ data: { userId, groupId, joinedAt } });
  }

  afterAll(async () => {
    await prisma.inviteToken.deleteMany({ where: { groupId: { in: createdGroupIds } } });
    await prisma.groupMember.deleteMany({ where: { groupId: { in: createdGroupIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.group.deleteMany({ where: { id: { in: createdGroupIds } } });
  });

  it("(a) returns null when the user belongs to no group", async () => {
    const user = await makeUser("none");
    await expect(resolveSelectedGroup(user.id)).resolves.toBeNull();
  });

  it("(b) returns the selected group when the user is a member", async () => {
    const user = await makeUser("member");
    const first = await makeGroup("first");
    const second = await makeGroup("second");
    await join(user.id, first.id, new Date("2026-01-01"));
    await join(user.id, second.id, new Date("2026-02-01"));
    await prisma.user.update({ where: { id: user.id }, data: { selectedGroupId: second.id } });

    const group = await resolveSelectedGroup(user.id);
    expect(group?.id).toBe(second.id);
  });

  it("(c) falls back to the earliest-joined group and saves it when the selection is missing", async () => {
    const user = await makeUser("fallback-null");
    const older = await makeGroup("older");
    const newer = await makeGroup("newer");
    await join(user.id, newer.id, new Date("2026-03-01"));
    await join(user.id, older.id, new Date("2026-01-01"));

    const group = await resolveSelectedGroup(user.id);
    expect(group?.id).toBe(older.id);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.selectedGroupId).toBe(older.id);
  });

  it("(c) falls back when the selected group is one the user does not belong to", async () => {
    const user = await makeUser("fallback-foreign");
    const mine = await makeGroup("mine");
    const foreign = await makeGroup("foreign");
    await join(user.id, mine.id, new Date("2026-01-01"));
    await prisma.user.update({ where: { id: user.id }, data: { selectedGroupId: foreign.id } });

    const group = await resolveSelectedGroup(user.id);
    expect(group?.id).toBe(mine.id);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.selectedGroupId).toBe(mine.id);
  });
});

// FR-026, FR-027: グループ切り替えと、招待での2つ目のグループへの参加
describe("selectGroup / joinGroupByToken", () => {
  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];

  async function makeUser(suffix: string) {
    const user = await prisma.user.create({
      data: {
        email: `select-${suffix}-${Date.now()}-${Math.random()}@example.com`,
        passwordHash: "test-hash",
        displayName: `Test ${suffix}`,
      },
    });
    createdUserIds.push(user.id);
    return user;
  }

  async function makeGroup(name: string) {
    const group = await prisma.group.create({ data: { name } });
    createdGroupIds.push(group.id);
    return group;
  }

  afterAll(async () => {
    await prisma.inviteToken.deleteMany({ where: { groupId: { in: createdGroupIds } } });
    await prisma.groupMember.deleteMany({ where: { groupId: { in: createdGroupIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.group.deleteMany({ where: { id: { in: createdGroupIds } } });
  });

  it("selectGroup updates the selection for a member", async () => {
    const user = await makeUser("select");
    const group = await makeGroup("select target");
    await prisma.groupMember.create({ data: { userId: user.id, groupId: group.id } });

    await selectGroup(user.id, group.id);

    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.selectedGroupId).toBe(group.id);
  });

  it("selectGroup rejects a non-member and keeps the selection", async () => {
    const user = await makeUser("select-outsider");
    const mine = await makeGroup("select mine");
    const foreign = await makeGroup("select foreign");
    await prisma.groupMember.create({ data: { userId: user.id, groupId: mine.id } });
    await prisma.user.update({ where: { id: user.id }, data: { selectedGroupId: mine.id } });

    await expect(selectGroup(user.id, foreign.id)).rejects.toBeInstanceOf(NotGroupMemberError);

    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.selectedGroupId).toBe(mine.id);
  });

  it("joining a second group by invite keeps the first membership and selects the new group", async () => {
    const owner = await makeUser("invite-owner");
    const user = await makeUser("invite-joiner");
    const first = await makeGroup("invite first");
    const second = await makeGroup("invite second");
    await prisma.groupMember.create({ data: { userId: user.id, groupId: first.id } });
    await prisma.groupMember.create({ data: { userId: owner.id, groupId: second.id } });
    await prisma.user.update({ where: { id: user.id }, data: { selectedGroupId: first.id } });
    const invite = await prisma.inviteToken.create({
      data: { token: `t-${Date.now()}-${Math.random()}`, groupId: second.id, createdBy: owner.id },
    });

    await joinGroupByToken(user.id, invite.token);

    const memberships = await prisma.groupMember.findMany({ where: { userId: user.id } });
    expect(memberships.map((m) => m.groupId).sort()).toEqual([first.id, second.id].sort());
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.selectedGroupId).toBe(second.id);
  });
});
