import { prisma } from "@/lib/db";

// 日別詳細の一覧（FR-019）。支払者の表示名も返す
export async function getDayExpenses(groupId: string, date: string) {
  const expenses = await prisma.expenseRecord.findMany({
    where: { groupId, spentOn: date },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { paidBy: { select: { id: true, displayName: true } } },
  });
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  return { date, total, expenses };
}

export type DayExpenses = Awaited<ReturnType<typeof getDayExpenses>>;
