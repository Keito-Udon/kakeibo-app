"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { ErrorMessage } from "@/components/ui/message";
import { HttpError, sendJson } from "@/lib/fetcher";
import { revalidateGroup } from "@/lib/swr-cache";

type Member = { id: string; displayName: string };

export type ExpenseFormValues = {
  amount: number | null;
  description: string;
  paidById: string;
  paymentMethod: "CASH" | "MOBILE";
  spentOn: string;
};

// 支出追加・支出編集で共用する入力フォーム（contracts/screens.md「支出追加・支出編集」）
export function ExpenseForm({
  groupId,
  members,
  initial,
  expenseId,
}: {
  groupId: string;
  members: Member[];
  initial: ExpenseFormValues;
  expenseId?: string; // 指定があれば編集
}) {
  const router = useRouter();
  const isEdit = expenseId !== undefined;
  const [amount, setAmount] = useState(initial.amount === null ? "" : String(initial.amount));
  const [description, setDescription] = useState(initial.description);
  const [paidById, setPaidById] = useState(initial.paidById);
  const [paymentMethod, setPaymentMethod] = useState(initial.paymentMethod);
  const [spentOn, setSpentOn] = useState(initial.spentOn);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const body = { amount: Number(amount), description, paidById, paymentMethod, spentOn };
    try {
      if (isEdit) {
        await sendJson("PATCH", `/api/groups/${groupId}/expenses/${expenseId}`, body);
      } else {
        await sendJson("POST", `/api/groups/${groupId}/expenses`, body);
      }
      await revalidateGroup(groupId);
      router.push(`/days/${spentOn}`);
    } catch (err) {
      // Edge Cases: 編集中に他のメンバーが削除した
      if (isEdit && err instanceof HttpError && err.status === 404) {
        setError("この支出は既に削除されています");
      } else {
        setError("保存に失敗しました（金額は1円以上、内容と支出日は必須です）");
      }
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-4 px-4 pb-12 pt-4">
      <button
        data-testid="expense-form-back"
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1 self-start text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        戻る
      </button>

      <Card>
        <h1 className="mb-4 text-lg font-bold text-foreground">
          {isEdit ? "支出を編集" : "支出を追加"}
        </h1>
        {/* 入力チェックはサーバー側（FR-022）に任せ、エラーを画面に表示する */}
        <form
          data-testid="expense-form"
          className="flex flex-col gap-4"
          onSubmit={handleSubmit}
          noValidate
        >
          <Field label="金額（円）">
            <Input
              data-testid="expense-form-amount"
              type="number"
              inputMode="numeric"
              placeholder="1500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="内容">
            <Input
              data-testid="expense-form-description"
              placeholder="スーパー"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="支出日">
            <Input
              data-testid="expense-form-date"
              type="date"
              value={spentOn}
              onChange={(e) => setSpentOn(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="支払者">
              <Select
                data-testid="expense-form-paid-by"
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
            <Field label="支払い方法">
              <Select
                data-testid="expense-form-payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "MOBILE")}
              >
                <option value="CASH">現金</option>
                <option value="MOBILE">モバイル決済</option>
              </Select>
            </Field>
          </div>

          {error && <ErrorMessage testId="expense-form-error">{error}</ErrorMessage>}

          <Button data-testid="expense-form-submit" type="submit" loading={submitting}>
            保存する
          </Button>
        </form>
      </Card>
    </main>
  );
}
