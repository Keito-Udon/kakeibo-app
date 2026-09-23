import { notFound } from "next/navigation";

import { ExpenseForm } from "@/components/expense-form";
import { requireBudgetedGroup } from "@/lib/active-group";
import { prisma } from "@/lib/db";
import { getGroupMembers } from "@/lib/groups";

// 支出編集画面。全項目（支出日を含む）を変更できる（FR-020）
export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ expenseId: string }>;
}) {
  const { expenseId } = await params;
  const { group } = await requireBudgetedGroup();

  // 選択中グループの支出でなければ存在しないものとして扱う（001のFR-007, FR-029）
  const expense = await prisma.expenseRecord.findFirst({
    where: { id: expenseId, groupId: group.id },
  });
  if (!expense) {
    notFound();
  }
  const members = await getGroupMembers(group.id);

  return (
    <ExpenseForm
      groupId={group.id}
      members={members}
      expenseId={expense.id}
      initial={{
        amount: expense.amount,
        description: expense.description,
        paidById: expense.paidById,
        paymentMethod: expense.paymentMethod,
        spentOn: expense.spentOn,
      }}
    />
  );
}
