import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isGroupMember } from "@/lib/groups";
import { expenseUpdateSchema } from "@/lib/validation/expense";
import { logger } from "@/lib/logger";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string; expenseId: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { groupId, expenseId } = await params;
  if (!(await isGroupMember(session.user.id, groupId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const existing = await prisma.expenseRecord.findFirst({
    where: { id: expenseId, groupId },
  });
  // 対象が既に削除されている場合は404（Edge Cases: 編集と削除の競合）
  if (!existing) {
    return NextResponse.json({ error: "expense not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = expenseUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // グループの誰でも編集可（FR-012）
  const updated = await prisma.expenseRecord.update({
    where: { id: expenseId },
    data: { ...parsed.data, updatedById: session.user.id },
  });

  logger.info("expense.update", { groupId, expenseId, userId: session.user.id });

  return NextResponse.json(updated, { status: 200 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ groupId: string; expenseId: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { groupId, expenseId } = await params;
  if (!(await isGroupMember(session.user.id, groupId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const existing = await prisma.expenseRecord.findFirst({
    where: { id: expenseId, groupId },
  });
  if (!existing) {
    return NextResponse.json({ error: "expense not found" }, { status: 404 });
  }

  // グループの誰でも削除可（FR-012）
  await prisma.expenseRecord.delete({ where: { id: expenseId } });

  logger.info("expense.delete", { groupId, expenseId, userId: session.user.id });

  return new NextResponse(null, { status: 204 });
}
