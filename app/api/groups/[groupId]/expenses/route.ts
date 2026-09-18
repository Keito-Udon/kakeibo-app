import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isGroupMember } from "@/lib/groups";
import { expenseInputSchema } from "@/lib/validation/expense";
import { logger } from "@/lib/logger";
import { getBudgetSummary } from "@/lib/budget";

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

  const summary = await getBudgetSummary(groupId);

  return NextResponse.json({ expenses, ...summary });
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

  const expense = await prisma.expenseRecord.create({
    data: {
      groupId,
      amount: parsed.data.amount,
      description: parsed.data.description,
      paidById: parsed.data.paidById,
      paymentMethod: parsed.data.paymentMethod,
      createdById: session.user.id,
    },
  });

  logger.info("expense.create", {
    groupId,
    expenseId: expense.id,
    userId: session.user.id,
    amount: expense.amount,
  });

  return NextResponse.json(expense, { status: 201 });
}
