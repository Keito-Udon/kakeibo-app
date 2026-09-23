import { notFound } from "next/navigation";

import { MonthCalendar } from "@/components/month-calendar";
import { requireBudgetedGroup } from "@/lib/active-group";
import { isValidYearMonth, todayJst } from "@/lib/date";

// カレンダー画面（contracts/screens.md「カレンダー」）
export default async function MonthPage({
  params,
}: {
  params: Promise<{ yearMonth: string }>;
}) {
  const { yearMonth } = await params;
  if (!isValidYearMonth(yearMonth)) {
    notFound();
  }

  const { group } = await requireBudgetedGroup();

  return (
    <MonthCalendar
      groupId={group.id}
      groupName={group.name}
      yearMonth={yearMonth}
      today={todayJst()}
    />
  );
}
