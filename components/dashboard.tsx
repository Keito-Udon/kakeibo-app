"use client";

import { useState } from "react";
import useSWR from "swr";

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
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <h1 data-testid="group-name" className="text-2xl font-bold">
        {groupName}
      </h1>

      <BudgetSection
        groupId={groupId}
        monthlyBudget={data?.monthlyBudget ?? null}
        currentMonthTotal={data?.currentMonthTotal ?? 0}
        remaining={data?.remaining ?? null}
        onUpdated={() => mutate()}
      />

      <InviteSection groupId={groupId} />

      <AddExpenseForm groupId={groupId} members={members} onAdded={() => mutate()} />

      <ExpenseList expenses={data?.expenses ?? []} memberName={memberName} onChanged={() => mutate()} groupId={groupId} />
    </main>
  );
}

function BudgetSection({
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
    <section className="rounded border p-4">
      <h2 className="font-bold">今月の予算</h2>
      {monthlyBudget === null ? (
        <p data-testid="budget-remaining" className="text-gray-600">
          未設定
        </p>
      ) : (
        <p
          data-testid="budget-remaining"
          className={remaining !== null && remaining < 0 ? "text-red-600 font-bold" : ""}
        >
          残額: {remaining}円（予算{monthlyBudget}円 − 支出{currentMonthTotal}円）
        </p>
      )}
      <form className="mt-2 flex gap-2" onSubmit={handleSubmit}>
        <input
          data-testid="budget-input"
          type="number"
          min={1}
          className="border rounded px-2 py-1 w-32"
          placeholder="予算額(円)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          data-testid="budget-submit"
          type="submit"
          disabled={submitting}
          className="rounded bg-black px-3 py-1 text-white disabled:opacity-50"
        >
          設定
        </button>
      </form>
    </section>
  );
}

function InviteSection({ groupId }: { groupId: string }) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function handleGenerate() {
    const result = await postJson<{ inviteUrl: string }>(
      `/api/groups/${groupId}/invite`,
      {},
    );
    setInviteUrl(result.inviteUrl);
  }

  return (
    <section className="rounded border p-4">
      <h2 className="font-bold">招待リンク</h2>
      <button
        data-testid="invite-generate"
        type="button"
        onClick={handleGenerate}
        className="mt-2 rounded bg-black px-3 py-1 text-white"
      >
        招待リンクを発行
      </button>
      {inviteUrl && (
        <p data-testid="invite-url" className="mt-2 break-all text-sm text-gray-700">
          {inviteUrl}
        </p>
      )}
    </section>
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
    <section className="rounded border p-4">
      <h2 className="font-bold">支出を記録</h2>
      <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1">
          <span className="text-sm">金額</span>
          <input
            data-testid="expense-amount"
            type="number"
            min={1}
            className="border rounded px-2 py-1 w-28"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">内容</span>
          <input
            data-testid="expense-description"
            className="border rounded px-2 py-1"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">支払者</span>
          <select
            data-testid="expense-paid-by"
            className="border rounded px-2 py-1"
            value={paidById}
            onChange={(e) => setPaidById(e.target.value)}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">支払い方法</span>
          <select
            data-testid="expense-payment-method"
            className="border rounded px-2 py-1"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "MOBILE")}
          >
            <option value="CASH">現金</option>
            <option value="MOBILE">モバイル決済</option>
          </select>
        </label>
        <button
          data-testid="expense-submit"
          type="submit"
          disabled={submitting}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          追加
        </button>
      </form>
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </section>
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

  function startEdit(expense: ExpenseRecord) {
    setEditingId(expense.id);
    setEditAmount(String(expense.amount));
  }

  async function saveEdit(expenseId: string) {
    await fetch(`/api/groups/${groupId}/expenses/${expenseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(editAmount) }),
    });
    setEditingId(null);
    onChanged();
  }

  async function handleDelete(expenseId: string) {
    await fetch(`/api/groups/${groupId}/expenses/${expenseId}`, { method: "DELETE" });
    onChanged();
  }

  const paymentMethodLabel = (method: "CASH" | "MOBILE") =>
    method === "CASH" ? "現金" : "モバイル決済";

  return (
    <section>
      <h2 className="font-bold">支出一覧</h2>
      <ul data-testid="expense-list" className="mt-2 flex flex-col gap-2">
        {expenses.map((expense) => (
          <li key={expense.id} className="flex items-center justify-between rounded border p-2">
            {editingId === expense.id ? (
              <div className="flex items-center gap-2">
                <input
                  className="border rounded px-2 py-1 w-24"
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
                <button type="button" onClick={() => saveEdit(expense.id)} className="text-blue-600">
                  保存
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="text-gray-500">
                  取消
                </button>
              </div>
            ) : (
              <div>
                <span className="font-bold">{expense.amount}円</span>
                <span className="ml-2">{expense.description}</span>
                <span className="ml-2 text-sm text-gray-500">
                  {memberName(expense.paidById)} / {paymentMethodLabel(expense.paymentMethod)}
                </span>
              </div>
            )}
            {editingId !== expense.id && (
              <div className="flex gap-2">
                <button type="button" onClick={() => startEdit(expense)} className="text-blue-600">
                  編集
                </button>
                <button type="button" onClick={() => handleDelete(expense.id)} className="text-red-600">
                  削除
                </button>
              </div>
            )}
          </li>
        ))}
        {expenses.length === 0 && <li className="text-gray-500">まだ支出記録がありません</li>}
      </ul>
    </section>
  );
}
