import { prisma } from "@/lib/db";

export type BudgetSummary = {
  monthlyBudget: number | null;
  currentMonthTotal: number;
  remaining: number | null;
};

// 当月（暦月）の支出のみを集計する。前月分は含めない（FR-009 acceptance scenario 3）。
export async function getBudgetSummary(groupId: string): Promise<BudgetSummary> {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new Error(`group not found: ${groupId}`);
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const result = await prisma.expenseRecord.aggregate({
    where: { groupId, createdAt: { gte: monthStart, lt: monthEnd } },
    _sum: { amount: true },
  });

  const currentMonthTotal = result._sum.amount ?? 0;
  const remaining =
    group.monthlyBudget === null ? null : group.monthlyBudget - currentMonthTotal;

  return { monthlyBudget: group.monthlyBudget, currentMonthTotal, remaining };
}
