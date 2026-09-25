import { z } from "zod";

import { isValidDate } from "@/lib/date";
import { countChars } from "@/lib/text";

export const TITLE_MAX_CHARS = 50;
export const MEMO_MAX_CHARS = 200;

// 支出日は実在する "YYYY-MM-DD"。過去・未来のどちらも許可する（002 FR-017, Edge Cases）
const spentOnSchema = z.string().refine(isValidDate, { message: "invalid date (YYYY-MM-DD)" });

// タイトル: 前後の空白を除いて1〜50文字（見た目の文字数）、改行なし（004 FR-002）
const titleSchema = z
  .string()
  .trim()
  .min(1, { message: "title is required" })
  .refine((t) => countChars(t) <= TITLE_MAX_CHARS, {
    message: `title must be at most ${TITLE_MAX_CHARS} characters`,
  })
  .refine((t) => !/[\r\n]/.test(t), { message: "title must not contain line breaks" });

// メモ: 前後の空白を除いて200文字以下（改行も1文字）。"" はメモなし（004 FR-003）
const memoSchema = z
  .string()
  .trim()
  .refine((m) => countChars(m) <= MEMO_MAX_CHARS, {
    message: `memo must be at most ${MEMO_MAX_CHARS} characters`,
  });

// amount must be > 0 (002 FR-022, Edge Cases: reject 0 or negative amounts)
export const expenseInputSchema = z.object({
  amount: z.number().int().positive(),
  title: titleSchema,
  memo: memoSchema.default(""),
  paidById: z.string().min(1),
  paymentMethod: z.enum(["CASH", "MOBILE"]),
  spentOn: spentOnSchema,
});

// 編集: 送られた項目だけを追加時と同じ条件で検証する。memo を省略したら変更しない
export const expenseUpdateSchema = expenseInputSchema.extend({ memo: memoSchema }).partial();

export type ExpenseInput = z.infer<typeof expenseInputSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;

// 月別の設定額は1円以上の整数（002 FR-007）
export const monthlyBudgetInputSchema = z.object({
  amount: z.number().int().positive(),
});
