import type { Group } from "@prisma/client";

import { prisma } from "@/lib/db";

export async function isGroupMember(userId: string, groupId: string): Promise<boolean> {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  return membership !== null;
}

// 選択中のグループを返す（FR-028）。未選択、または所属していないグループを指している場合は、
// 最初に参加したグループを選び直して保存する（data-model.md「User（変更）」）。
export async function resolveSelectedGroup(userId: string): Promise<Group | null> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { selectedGroupId: true },
  });

  if (user.selectedGroupId) {
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: user.selectedGroupId } },
      include: { group: true },
    });
    if (membership) return membership.group;
  }

  const earliest = await prisma.groupMember.findFirst({
    where: { userId },
    orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
    include: { group: true },
  });
  const selectedGroupId = earliest?.groupId ?? null;
  if (selectedGroupId !== user.selectedGroupId) {
    await prisma.user.update({ where: { id: userId }, data: { selectedGroupId } });
  }
  return earliest?.group ?? null;
}
