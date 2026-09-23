import { notFound } from "next/navigation";

import { BudgetForm } from "@/components/budget-form";
import { requireActiveGroup } from "@/lib/active-group";
import { getMonthSummary, hasAnyBudget } from "@/lib/budget";
import { isValidYearMonth } from "@/lib/date";

// 予算決定・変更画面。予算未設定のグループでも開ける（FR-002, FR-006）
export default async function MonthBudgetPage({
  params,
}: {
  params: Promise<{ yearMonth: string }>;
}) {
  const { yearMonth } = await params;
  if (!isValidYearMonth(yearMonth)) {
    notFound();
  }

  const { group } = await requireActiveGroup();
  const [summary, budgeted] = await Promise.all([
    getMonthSummary(group.id, yearMonth),
    hasAnyBudget(group.id),
  ]);

  return (
    <BudgetForm
      groupId={group.id}
      yearMonth={yearMonth}
      initialAmount={summary.budget?.setAmount ?? null}
      carryover={summary.budget?.carryover ?? 0}
      isFirstBudget={!budgeted}
    />
  );
}
