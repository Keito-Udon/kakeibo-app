import { describe, expect, it } from "vitest";

import { expenseInputSchema } from "@/lib/validation/expense";

// FR-010 / Edge Cases: expense amount must be rejected when <= 0
describe("expenseInputSchema", () => {
  const base = {
    description: "コンビニ",
    paidById: "user_1",
    paymentMethod: "CASH" as const,
  };

  it("rejects an amount of 0", () => {
    const result = expenseInputSchema.safeParse({ ...base, amount: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const result = expenseInputSchema.safeParse({ ...base, amount: -100 });
    expect(result.success).toBe(false);
  });

  it("accepts a positive integer amount", () => {
    const result = expenseInputSchema.safeParse({ ...base, amount: 1500 });
    expect(result.success).toBe(true);
  });
});
