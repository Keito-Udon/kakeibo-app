import { prisma } from "@/lib/db";

export async function isGroupMember(userId: string, groupId: string): Promise<boolean> {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  return membership !== null;
}
