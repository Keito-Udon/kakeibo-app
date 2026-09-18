import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { isGroupMember } from "@/lib/groups";

// FR-007: users outside a group must not be able to access that group's data
describe("isGroupMember", () => {
  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];

  async function makeUser(suffix: string) {
    const user = await prisma.user.create({
      data: {
        email: `group-auth-${suffix}-${Date.now()}@example.com`,
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
    await prisma.groupMember.deleteMany({ where: { groupId: { in: createdGroupIds } } });
    await prisma.group.deleteMany({ where: { id: { in: createdGroupIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  });

  it("returns true for a user who belongs to the group", async () => {
    const user = await makeUser("member");
    const group = await makeGroup("membership test group");
    await prisma.groupMember.create({ data: { userId: user.id, groupId: group.id } });

    await expect(isGroupMember(user.id, group.id)).resolves.toBe(true);
  });

  it("returns false for a user who does not belong to the group", async () => {
    const user = await makeUser("outsider");
    const group = await makeGroup("outsider test group");

    await expect(isGroupMember(user.id, group.id)).resolves.toBe(false);
  });
});
