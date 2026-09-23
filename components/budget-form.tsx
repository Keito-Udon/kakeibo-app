"use client";

import { ArrowLeft, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mutate } from "swr";

import { monthSummaryKey } from "@/components/month-calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { ErrorMessage } from "@/components/ui/message";
import { sendJson } from "@/lib/fetcher";
import { formatYearMonth, formatYen } from "@/lib/format";

// 予算決定・変更画面（contracts/screens.md「予算決定・変更」）。役割は「その月の設定額を決める」だけ
export function BudgetForm({
  groupId,
  yearMonth,
  initialAmount,
  carryover,
  isFirstBudget,
}: {
  groupId: string;
  yearMonth: string;
  initialAmount: number | null;
  carryover: number;
  isFirstBudget: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(initialAmount === null ? "" : String(initialAmount));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await sendJson("PUT", `/api/groups/${groupId}/months/${yearMonth}/budget`, {
        amount: Number(amount),
      });
      // 戻った直後のカレンダーに新しい残額を出す（research.md #8）
      await mutate(monthSummaryKey(groupId, yearMonth));
      router.push(`/months/${yearMonth}`);
    } catch {
      setError("予算の保存に失敗しました（1円以上の整数で入力してください）");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-4 px-4 pb-12 pt-4">
      {!isFirstBudget && (
        <Link
          data-testid="budget-form-back"
          href={`/months/${yearMonth}`}
          className="flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          カレンダーに戻る
        </Link>
      )}

      <Card>
        {/* 入力チェックはサーバー側（FR-007）に任せ、エラーを画面に表示する */}
        <form
          data-testid="budget-form"
          className="flex flex-col gap-4"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Wallet className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-muted">{formatYearMonth(yearMonth)}</p>
              <h1 className="text-lg font-bold text-foreground">
                {isFirstBudget ? "予算を決める" : "予算を変更する"}
              </h1>
            </div>
          </div>

          {isFirstBudget && (
            <p className="text-sm text-muted">
              毎月の予算額を決めてください。使い切れなかった分は翌月に繰り越されます。
            </p>
          )}

          <Field label="この月の設定額（円）">
            <Input
              data-testid="budget-form-amount"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              placeholder="20000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Field>

          <p data-testid="budget-form-carryover" className="text-sm text-muted">
            前月からの繰越: <span className="font-medium text-foreground">{formatYen(carryover)}</span>
          </p>

          {error && <ErrorMessage testId="budget-form-error">{error}</ErrorMessage>}

          <Button data-testid="budget-form-submit" type="submit" loading={submitting}>
            保存する
          </Button>
        </form>
      </Card>
    </main>
  );
}
