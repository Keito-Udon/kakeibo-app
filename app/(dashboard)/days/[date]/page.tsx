import { notFound } from "next/navigation";

import { DayExpenseList } from "@/components/day-expense-list";
import { requireBudgetedGroup } from "@/lib/active-group";
import { isValidDate } from "@/lib/date";

// 日別詳細画面（FR-019）
export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isValidDate(date)) {
    notFound();
  }

  const { group } = await requireBudgetedGroup();

  return <DayExpenseList groupId={group.id} date={date} />;
}
