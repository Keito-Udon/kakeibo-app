import { z } from "zod";

// amount must be > 0 (FR-010, Edge Cases: reject 0 or negative amounts)
export const expenseInputSchema = z.object({
  amount: z.number().int().positive(),
  description: z.string().min(1).max(200),
  paidById: z.string().min(1),
  paymentMethod: z.enum(["CASH", "MOBILE"]),
});

export const expenseUpdateSchema = expenseInputSchema.partial();

export type ExpenseInput = z.infer<typeof expenseInputSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;

export const budgetInputSchema = z.object({
  monthlyBudget: z.number().int().positive(),
});
