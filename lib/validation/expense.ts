import { z } from "zod";

import { isValidDate } from "@/lib/date";

// 支出日は実在する "YYYY-MM-DD"。過去・未来のどちらも許可する（FR-017, Edge Cases）
const spentOnSchema = z.string().refine(isValidDate, { message: "invalid date (YYYY-MM-DD)" });

// amount must be > 0 (FR-022, Edge Cases: reject 0 or negative amounts)
export const expenseInputSchema = z.object({
  amount: z.number().int().positive(),
  description: z.string().min(1).max(200),
  paidById: z.string().min(1),
  paymentMethod: z.enum(["CASH", "MOBILE"]),
  spentOn: spentOnSchema,
});

export const expenseUpdateSchema = expenseInputSchema.partial();

export type ExpenseInput = z.infer<typeof expenseInputSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;

// 月別の設定額は1円以上の整数（FR-007）
export const monthlyBudgetInputSchema = z.object({
  amount: z.number().int().positive(),
});
