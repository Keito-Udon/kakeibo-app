"use client";

import { CreditCard, Link2, Pencil, Plus, Trash2, Wallet, X } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { ErrorMessage } from "@/components/ui/message";
import { fetcher, postJson } from "@/lib/fetcher";

type Member = { id: string; displayName: string };

type ExpenseRecord = {
  id: string;
  amount: number;
  description: string;
  paidById: string;
  paymentMethod: "CASH" | "MOBILE";
  createdAt: string;
};

type ExpensesResponse = {
  expenses: ExpenseRecord[];
  monthlyBudget: number | null;
  currentMonthTotal: number;
  remaining: number | null;
};

// 数秒以内の自動反映を、SWRのショートポーリングで実現する（FR-013, research.md #1）
const POLL_INTERVAL_MS = 4000;

export function Dashboard({
  groupId,
  groupName,
  members,
}: {
  groupId: string;
  groupName: string;
  members: Member[];
}) {
  const { data, mutate } = useSWR<ExpensesResponse>(
    `/api/groups/${groupId}/expenses`,
    fetcher,
    { refreshInterval: POLL_INTERVAL_MS },
  );

  const memberName = (id: string) => members.find((m) => m.id === id)?.displayName ?? "?";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 pb-12 pt-4">
      <h1 data-testid="group-name" className="text-2xl font-bold text-foreground">
        {groupName}
      </h1>

      <BudgetHero
        groupId={groupId}
        monthlyBudget={data?.monthlyBudget ?? null}
        currentMonthTotal={data?.currentMonthTotal ?? 0}
        remaining={data?.remaining ?? null}
        onUpdated={() => mutate()}
      />

      <AddExpenseForm groupId={groupId} members={members} onAdded={() => mutate()} />

      <ExpenseList
        expenses={data?.expenses ?? []}
        memberName={memberName}
        onChanged={() => mutate()}
        groupId={groupId}
      />

      <InviteSection groupId={groupId} />
    </main>
  );
}

function BudgetHero({
  groupId,
  monthlyBudget,
  currentMonthTotal,
  remaining,
  onUpdated,
}: {
  groupId: string;
  monthlyBudget: number | null;
  currentMonthTotal: number;
  remaining: number | null;
  onUpdated: () => void;
}) {
  const [value, setValue] = useState(monthlyBudget ? String(monthlyBudget) : "");
  const [submitting, setSubmitting] = useState(false);

  const isOverBudget = remaining !== null && remaining < 0;
  const usageRatio =
    monthlyBudget && monthlyBudget > 0
      ? Math.min(currentMonthTotal / monthlyBudget, 1)
      : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(`/api/groups/${groupId}/budget`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyBudget: Number(value) }),
      });
      onUpdated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className={isOverBudget ? "border-danger/40" : ""}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
              isOverBudget ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
            }`}
          >
            <Wallet className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-muted">今月の残額</p>
            <p data-testid="budget-remaining">
              {monthlyBudget === null ? (
                <span className="text-2xl font-bold text-muted">未設定</span>
              ) : (
                <>
                  <span
                    className={`text-3xl font-bold ${isOverBudget ? "text-danger" : "text-foreground"}`}
                  >
                    残額: {remaining}円
                  </span>
                  <br />
                  <span className="text-xs text-muted">
                    （予算{monthlyBudget}円 − 支出{currentMonthTotal}円）
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {monthlyBudget !== null && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
          <div
            className={`h-full rounded-full transition-all ${isOverBudget ? "bg-danger" : "bg-primary"}`}
            style={{ width: `${usageRatio * 100}%` }}
          />
        </div>
      )}

      <form className="mt-4 flex items-end gap-2 border-t border-border pt-4" onSubmit={handleSubmit}>
        <div className="flex-1">
          <Field label={monthlyBudget === null ? "月次予算を設定(円)" : "月次予算を変更(円)"}>
            <Input
              data-testid="budget-input"
              type="number"
              min={1}
              placeholder="20000"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
        </div>
        <Button data-testid="budget-submit" type="submit" loading={submitting}>
          保存
        </Button>
      </form>
    </Card>
  );
}

function InviteSection({ groupId }: { groupId: string }) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await postJson<{ inviteUrl: string }>(
        `/api/groups/${groupId}/invite`,
        {},
      );
      setInviteUrl(result.inviteUrl);
      setCopied(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      // クリップボードAPIが使えない環境では、URLをそのまま表示しているのでコピーは手動で行う
    }
  }

  return (
    <Card>
      <CardTitle>パートナーを招待</CardTitle>
      <p className="mb-3 text-sm text-muted">
        招待リンクを共有すると、リンクを開いた人がこのグループに参加できます。
      </p>
      <Button variant="secondary" onClick={handleGenerate} loading={loading}>
        <Link2 className="size-4" aria-hidden="true" />
        <span data-testid="invite-generate">招待リンクを発行</span>
      </Button>
      {inviteUrl && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg bg-background p-3 sm:flex-row sm:items-center">
          <p data-testid="invite-url" className="flex-1 break-all text-sm text-foreground">
            {inviteUrl}
          </p>
          <Button variant="secondary" type="button" onClick={handleCopy} className="shrink-0">
            {copied ? "コピーしました" : "コピー"}
          </Button>
        </div>
      )}
    </Card>
  );
}

function AddExpenseForm({
  groupId,
  members,
  onAdded,
}: {
  groupId: string;
  members: Member[];
  onAdded: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paidById, setPaidById] = useState(members[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MOBILE">("CASH");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await postJson(`/api/groups/${groupId}/expenses`, {
        amount: Number(amount),
        description,
        paidById,
        paymentMethod,
      });
      setAmount("");
      setDescription("");
      onAdded();
    } catch {
      setError("支出の記録に失敗しました（金額は1円以上で入力してください）");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardTitle>支出を記録</CardTitle>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="金額(円)">
            <Input
              data-testid="expense-amount"
              type="number"
              min={1}
              placeholder="1500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Field>
          <Field label="支払者">
            <Select
              data-testid="expense-paid-by"
              value={paidById}
              onChange={(e) => setPaidById(e.target.value)}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="内容">
          <Input
            data-testid="expense-description"
            placeholder="コンビニ、食費など"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </Field>
        <Field label="支払い方法">
          <Select
            data-testid="expense-payment-method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "MOBILE")}
          >
            <option value="CASH">現金</option>
            <option value="MOBILE">モバイル決済</option>
          </Select>
        </Field>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <Button data-testid="expense-submit" type="submit" loading={submitting}>
          <Plus className="size-4" aria-hidden="true" />
          記録する
        </Button>
      </form>
    </Card>
  );
}

function ExpenseList({
  expenses,
  memberName,
  onChanged,
  groupId,
}: {
  expenses: ExpenseRecord[];
  memberName: (id: string) => string;
  onChanged: () => void;
  groupId: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  function startEdit(expense: ExpenseRecord) {
    setEditingId(expense.id);
    setEditAmount(String(expense.amount));
    setActionError(null);
  }

  // 編集中に他のメンバーが同じ記録を削除した場合は404になる（Edge Cases）。
  // ユーザーに黙って成功扱いにせず、記録が既に存在しないことを伝える。
  async function saveEdit(expenseId: string) {
    const res = await fetch(`/api/groups/${groupId}/expenses/${expenseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(editAmount) }),
    });

    if (res.status === 404) {
      setActionError("この記録は既に削除されています");
      setEditingId(null);
      onChanged();
      return;
    }
    if (!res.ok) {
      setActionError("編集に失敗しました");
      return;
    }

    setActionError(null);
    setEditingId(null);
    onChanged();
  }

  async function handleDelete(expenseId: string) {
    const res = await fetch(`/api/groups/${groupId}/expenses/${expenseId}`, {
      method: "DELETE",
    });

    if (res.status === 404) {
      setActionError("この記録は既に削除されています");
      onChanged();
      return;
    }
    if (!res.ok) {
      setActionError("削除に失敗しました");
      return;
    }

    setActionError(null);
    onChanged();
  }

  return (
    <Card>
      <CardTitle>支出一覧</CardTitle>
      {actionError && (
        <div className="mb-3">
          <ErrorMessage testId="expense-action-error">{actionError}</ErrorMessage>
        </div>
      )}
      <ul data-testid="expense-list" className="flex flex-col gap-2">
        {expenses.map((expense) => (
          <li
            key={expense.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
          >
            {editingId === expense.id ? (
              <div className="flex flex-1 items-center gap-2">
                <Input
                  data-testid="expense-edit-amount"
                  className="w-24"
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
                <Button
                  data-testid="expense-edit-save"
                  type="button"
                  variant="primary"
                  className="px-3 py-1.5"
                  onClick={() => saveEdit(expense.id)}
                >
                  保存
                </Button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-muted hover:text-foreground"
                  aria-label="キャンセル"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                    expense.paymentMethod === "MOBILE"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                  }`}
                >
                  <CreditCard className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {expense.description}
                    <span className="ml-2 font-bold">{expense.amount}円</span>
                  </p>
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <span className="truncate">{memberName(expense.paidById)}</span>
                    <Badge tone={expense.paymentMethod === "MOBILE" ? "mobile" : "cash"}>
                      {expense.paymentMethod === "MOBILE" ? "モバイル決済" : "現金"}
                    </Badge>
                  </p>
                </div>
              </div>
            )}
            {editingId !== expense.id && (
              <div className="flex shrink-0 gap-1">
                <button
                  data-testid="expense-edit-start"
                  type="button"
                  onClick={() => startEdit(expense)}
                  className="rounded-lg p-2 text-muted hover:bg-background hover:text-primary"
                  aria-label="編集"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  data-testid="expense-delete"
                  type="button"
                  onClick={() => handleDelete(expense.id)}
                  className="rounded-lg p-2 text-muted hover:bg-background hover:text-danger"
                  aria-label="削除"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            )}
          </li>
        ))}
        {expenses.length === 0 && (
          <li className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted">
            まだ支出記録がありません。上のフォームから最初の記録を追加しましょう。
          </li>
        )}
      </ul>
    </Card>
  );
}
