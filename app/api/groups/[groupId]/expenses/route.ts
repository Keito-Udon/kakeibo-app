import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isGroupMember } from "@/lib/groups";
import { expenseInputSchema } from "@/lib/validation/expense";
import { logger } from "@/lib/logger";
import { getMonthSummary } from "@/lib/budget";
import { currentYearMonthJst } from "@/lib/date";

// 001の旧画面（components/dashboard.tsx）のための一時的な互換エンドポイント。
// 新画面は月別・日別のAPIを使う。Phase 7（T061）で削除する。
export async function GET(
  _request: Request,
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

  const expenses = await prisma.expenseRecord.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
  });

  const summary = await getMonthSummary(groupId, currentYearMonthJst());

  return NextResponse.json({
    expenses,
    monthlyBudget: summary.budget?.setAmount ?? null,
    currentMonthTotal: summary.spent,
    remaining: summary.remaining,
  });
}

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

  const body = await request.json();
  const parsed = expenseInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // 支払者はグループのメンバーに限る（FR-017）
  if (!(await isGroupMember(parsed.data.paidById, groupId))) {
    return NextResponse.json({ error: "paidById is not a group member" }, { status: 400 });
  }

  const expense = await prisma.expenseRecord.create({
    data: {
      groupId,
      amount: parsed.data.amount,
      description: parsed.data.description,
      paidById: parsed.data.paidById,
      paymentMethod: parsed.data.paymentMethod,
      spentOn: parsed.data.spentOn,
      createdById: session.user.id,
    },
  });

  logger.info("expense.create", {
    groupId,
    expenseId: expense.id,
    userId: session.user.id,
    amount: expense.amount,
    spentOn: expense.spentOn,
  });

  return NextResponse.json(expense, { status: 201 });
}
