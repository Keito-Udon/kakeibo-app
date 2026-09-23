import { prisma } from "@/lib/db";
import { addMonths, yearMonthOf } from "@/lib/date";
import { logger } from "@/lib/logger";
import { getMemberTotals, type MemberTotal } from "@/lib/member-spending";

export type MonthBudget = {
  setAmount: number; // その月の設定額（引き継ぎ後。FR-008）
  carryover: number; // 前月からの繰越額（マイナスあり。FR-010）
  total: number; // setAmount + carryover
};

export type MonthSummary = {
  budget: MonthBudget | null; // 予算開始月より前、または予算が1件もない場合は null
  spent: number;
  remaining: number | null;
};

export type MonthSummaryResponse = MonthSummary & {
  yearMonth: string;
  dailyTotals: Record<string, number>;
  memberTotals: MemberTotal[]; // 003: 支払者ごとの支払額。カレンダーと同じ取得でそろえる（research.md #2）
};

type BudgetSetting = { yearMonth: string; amount: number };

// 繰越額・残額は保存せず、予算開始月から1か月ずつ積み上げて求める（research.md #5）
export function computeMonthSummary(
  budgets: BudgetSetting[],
  monthlyTotals: Record<string, number>,
  targetYearMonth: string,
): MonthSummary {
  const spent = monthlyTotals[targetYearMonth] ?? 0;
  if (budgets.length === 0) {
    return { budget: null, spent, remaining: null };
  }

  const setAmounts = new Map(budgets.map((b) => [b.yearMonth, b.amount]));
  const startYearMonth = [...setAmounts.keys()].sort()[0];
  if (targetYearMonth < startYearMonth) {
    return { budget: null, spent, remaining: null };
  }

  let setAmount = 0;
  let carryover = 0;
  for (let ym = startYearMonth; ; ym = addMonths(ym, 1)) {
    setAmount = setAmounts.get(ym) ?? setAmount;
    const total = setAmount + carryover;
    const remaining = total - (monthlyTotals[ym] ?? 0);
    if (ym === targetYearMonth) {
      return { budget: { setAmount, carryover, total }, spent, remaining };
    }
    carryover = remaining;
  }
}

export async function getMonthSummary(
  groupId: string,
  yearMonth: string,
): Promise<MonthSummaryResponse> {
  const budgets = await prisma.monthlyBudget.findMany({
    where: { groupId },
    select: { yearMonth: true, amount: true },
  });
  const startYearMonth = budgets.map((b) => b.yearMonth).sort()[0];
  // 繰越の計算に必要な予算開始月から、表示月の末日までの支出を日別に集計する
  const fromYearMonth =
    startYearMonth && startYearMonth < yearMonth ? startYearMonth : yearMonth;

  const daily = await prisma.expenseRecord.groupBy({
    by: ["spentOn"],
    where: { groupId, spentOn: { gte: `${fromYearMonth}-01`, lte: `${yearMonth}-31` } },
    _sum: { amount: true },
  });

  const monthlyTotals: Record<string, number> = {};
  const dailyTotals: Record<string, number> = {};
  for (const row of daily) {
    const amount = row._sum.amount ?? 0;
    const ym = yearMonthOf(row.spentOn);
    monthlyTotals[ym] = (monthlyTotals[ym] ?? 0) + amount;
    if (ym === yearMonth) {
      dailyTotals[row.spentOn] = amount;
    }
  }

  return {
    yearMonth,
    ...computeMonthSummary(budgets, monthlyTotals, yearMonth),
    dailyTotals,
    memberTotals: await getMemberTotals(groupId, yearMonth),
  };
}

// 同じ年月は上書きする。同時に変更された場合は後から保存された値が残る（Edge Cases）
export async function setMonthlyBudget(
  groupId: string,
  yearMonth: string,
  amount: number,
  userId: string,
) {
  const budget = await prisma.monthlyBudget.upsert({
    where: { groupId_yearMonth: { groupId, yearMonth } },
    update: { amount, updatedById: userId },
    create: { groupId, yearMonth, amount, updatedById: userId },
  });
  logger.info("budget.set", { groupId, yearMonth, amount, userId });
  return budget;
}

// 「グループで一度でも予算が設定されたか」（FR-001, FR-003）
export async function hasAnyBudget(groupId: string): Promise<boolean> {
  const count = await prisma.monthlyBudget.count({ where: { groupId } });
  return count > 0;
}
