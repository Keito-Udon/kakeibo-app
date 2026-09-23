import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { setMonthlyBudget } from "@/lib/budget";
import { isValidYearMonth } from "@/lib/date";
import { isGroupMember } from "@/lib/groups";
import { monthlyBudgetInputSchema } from "@/lib/validation/expense";

// その月の設定額を登録・変更する。初回の予算決定にも使う（FR-005〜FR-007, FR-009）
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ groupId: string; yearMonth: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { groupId, yearMonth } = await params;
  if (!(await isGroupMember(session.user.id, groupId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!isValidYearMonth(yearMonth)) {
    return NextResponse.json({ error: `invalid yearMonth: ${yearMonth}` }, { status: 400 });
  }

  const parsed = monthlyBudgetInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const budget = await setMonthlyBudget(groupId, yearMonth, parsed.data.amount, session.user.id);

  return NextResponse.json({ yearMonth: budget.yearMonth, amount: budget.amount });
}
