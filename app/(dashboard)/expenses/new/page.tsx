import { ExpenseForm } from "@/components/expense-form";
import { requireBudgetedGroup } from "@/lib/active-group";
import { isValidDate, todayJst } from "@/lib/date";
import { getGroupMembers } from "@/lib/groups";

// 支出追加画面。支出日の初期値は ?date=、なければ今日（FR-018）
export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const { userId, group } = await requireBudgetedGroup();
  const { date } = await searchParams;
  const spentOn = typeof date === "string" && isValidDate(date) ? date : todayJst();
  const members = await getGroupMembers(group.id);

  return (
    <ExpenseForm
      groupId={group.id}
      members={members}
      initial={{
        amount: null,
        title: "",
        memo: "",
        paidById: userId,
        paymentMethod: "CASH",
        spentOn,
      }}
    />
  );
}
