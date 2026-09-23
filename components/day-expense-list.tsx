"use client";

import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/message";
import { yearMonthOf } from "@/lib/date";
import type { DayExpenses } from "@/lib/expenses";
import { fetcher } from "@/lib/fetcher";
import { formatYen } from "@/lib/format";
import { revalidateGroup } from "@/lib/swr-cache";

// 他メンバーの変更を数秒以内に反映する（FR-021, research.md #8）
const POLL_INTERVAL_MS = 3000;

// JSONで受け取るため日時は文字列になる
type DayExpensesResponse = Omit<DayExpenses, "expenses"> & {
  expenses: (Omit<DayExpenses["expenses"][number], "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
  })[];
};

function formatDate(date: string) {
  const [, month, day] = date.split("-").map(Number);
  return `${month}月${day}日`;
}

// 日別詳細画面（contracts/screens.md「日別詳細」）
export function DayExpenseList({ groupId, date }: { groupId: string; date: string }) {
  const { data, mutate } = useSWR<DayExpensesResponse>(
    `/api/groups/${groupId}/days/${date}`,
    fetcher,
    { refreshInterval: POLL_INTERVAL_MS },
  );
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(expenseId: string) {
    if (!confirm("この支出を削除しますか？")) return;
    setError(null);
    const res = await fetch(`/api/groups/${groupId}/expenses/${expenseId}`, { method: "DELETE" });
    if (res.status === 404) {
      setError("この支出は既に削除されています");
    } else if (!res.ok) {
      setError("削除に失敗しました");
    }
    await mutate();
    await revalidateGroup(groupId);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pb-12 pt-4">
      <Link
        data-testid="day-back"
        href={`/months/${yearMonthOf(date)}`}
        className="flex items-center gap-1 self-start text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        カレンダーに戻る
      </Link>

      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">{formatDate(date)}</h1>
          <p data-testid="day-total" className="text-sm text-muted">
            合計 {formatYen(data?.total ?? 0)}
          </p>
        </div>
        <Link
          data-testid="day-add"
          href={`/expenses/new?date=${date}`}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="size-4" aria-hidden="true" />
          追加
        </Link>
      </header>

      {error && <ErrorMessage testId="day-error">{error}</ErrorMessage>}

      {data !== undefined && data.expenses.length === 0 ? (
        <Card>
          <p data-testid="day-empty" className="text-center text-sm text-muted">
            支出はありません
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {data?.expenses.map((expense) => (
            <li
              key={expense.id}
              data-testid="day-expense-item"
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm"
            >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-lg font-bold text-foreground">{formatYen(expense.amount)}</p>
                  <p className="truncate text-sm text-foreground">{expense.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>{expense.paidBy.displayName}</span>
                    {expense.paymentMethod === "MOBILE" ? (
                      <Badge tone="mobile">モバイル決済</Badge>
                    ) : (
                      <Badge tone="cash">現金</Badge>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Link
                    data-testid="day-expense-edit"
                    href={`/expenses/${expense.id}/edit`}
                    aria-label="編集"
                    className="rounded-lg p-2 text-muted hover:bg-background hover:text-foreground"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </Link>
                  <button
                    data-testid="day-expense-delete"
                    type="button"
                    aria-label="削除"
                    onClick={() => handleDelete(expense.id)}
                    className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
