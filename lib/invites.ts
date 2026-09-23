import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export class InviteNotFoundError extends Error {}

export async function joinGroupByToken(userId: string, token: string): Promise<string> {
  const invite = await prisma.inviteToken.findUnique({ where: { token } });

  // トークンが存在しない、または失効済みなら参加不可（Edge Cases）
  if (!invite || invite.revokedAt) {
    throw new InviteNotFoundError(`invite not found or revoked: ${token}`);
  }

  await prisma.groupMember.upsert({
    where: { userId_groupId: { userId, groupId: invite.groupId } },
    update: {},
    create: { userId, groupId: invite.groupId },
  });
  // 既存の所属は残したまま、参加したグループを選択中にする（FR-026）
  await prisma.user.update({ where: { id: userId }, data: { selectedGroupId: invite.groupId } });

  logger.info("group.join", { groupId: invite.groupId, userId });

  return invite.groupId;
}
