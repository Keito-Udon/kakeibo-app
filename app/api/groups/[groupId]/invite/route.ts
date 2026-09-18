import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isGroupMember } from "@/lib/groups";
import { logger } from "@/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { groupId } = await params;
  if (!(await isGroupMember(session.user.id, groupId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 既存の有効なトークンを失効させてから再発行する（research.md #3）
  await prisma.inviteToken.updateMany({
    where: { groupId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const token = randomUUID();
  await prisma.inviteToken.create({
    data: { token, groupId, createdBy: session.user.id },
  });

  logger.info("invite.issue", { groupId, userId: session.user.id });

  const origin = new URL(request.url).origin;
  return NextResponse.json(
    { token, inviteUrl: `${origin}/invite/${token}` },
    { status: 201 },
  );
}
