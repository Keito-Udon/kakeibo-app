import { describe, expect, it } from "vitest";

import {
  expenseInputSchema,
  expenseUpdateSchema,
  monthlyBudgetInputSchema,
} from "@/lib/validation/expense";

// FR-022（001のFR-010） / Edge Cases: expense amount must be rejected when <= 0
describe("expenseInputSchema", () => {
  const base = {
    description: "コンビニ",
    paidById: "user_1",
    paymentMethod: "CASH" as const,
    spentOn: "2026-09-05",
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

  // FR-017: 支出日は必須
  it("requires spentOn", () => {
    const result = expenseInputSchema.safeParse({ ...base, spentOn: undefined, amount: 1500 });
    expect(result.success).toBe(false);
  });

  it.each(["2026-02-30", "2026/09/05", "2026-9-5", ""])("rejects spentOn %s", (spentOn) => {
    const result = expenseInputSchema.safeParse({ ...base, amount: 1500, spentOn });
    expect(result.success).toBe(false);
  });

  // Edge Cases: 過去・未来の日付も記録できる
  it.each(["2020-01-01", "2030-12-31"])("accepts past/future spentOn %s", (spentOn) => {
    const result = expenseInputSchema.safeParse({ ...base, amount: 1500, spentOn });
    expect(result.success).toBe(true);
  });
});

describe("expenseUpdateSchema", () => {
  it("allows omitting spentOn", () => {
    expect(expenseUpdateSchema.safeParse({ amount: 2000 }).success).toBe(true);
  });

  it("validates spentOn when present", () => {
    expect(expenseUpdateSchema.safeParse({ spentOn: "2026-09-06" }).success).toBe(true);
    expect(expenseUpdateSchema.safeParse({ spentOn: "2026-09-31" }).success).toBe(false);
  });
});

// FR-007: 設定額は1円以上の整数
describe("monthlyBudgetInputSchema", () => {
  it.each([0, -1, 1.5])("rejects amount %s", (amount) => {
    expect(monthlyBudgetInputSchema.safeParse({ amount }).success).toBe(false);
  });

  it.each([1, 20000])("accepts amount %s", (amount) => {
    expect(monthlyBudgetInputSchema.safeParse({ amount }).success).toBe(true);
  });
});
