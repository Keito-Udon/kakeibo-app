import { describe, expect, it } from "vitest";

import {
  expenseInputSchema,
  expenseUpdateSchema,
  monthlyBudgetInputSchema,
} from "@/lib/validation/expense";

// 002 FR-022（001のFR-010） / Edge Cases: expense amount must be rejected when <= 0
describe("expenseInputSchema", () => {
  const base = {
    title: "コンビニ",
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

  // 002 FR-017: 支出日は必須
  it("requires spentOn", () => {
    const result = expenseInputSchema.safeParse({ ...base, spentOn: undefined, amount: 1500 });
    expect(result.success).toBe(false);
  });

  it.each(["2026-02-30", "2026/09/05", "2026-9-5", ""])("rejects spentOn %s", (spentOn) => {
    const result = expenseInputSchema.safeParse({ ...base, amount: 1500, spentOn });
    expect(result.success).toBe(false);
  });

  // 002 Edge Cases: 過去・未来の日付も記録できる
  it.each(["2020-01-01", "2030-12-31"])("accepts past/future spentOn %s", (spentOn) => {
    const result = expenseInputSchema.safeParse({ ...base, amount: 1500, spentOn });
    expect(result.success).toBe(true);
  });
});

// 004 FR-002, FR-003 / data-model.md「バリデーション」: タイトルとメモ
describe("expenseInputSchema title / memo", () => {
  const base = {
    amount: 1500,
    paidById: "user_1",
    paymentMethod: "CASH" as const,
    spentOn: "2026-09-05",
  };
  const parse = (fields: Record<string, unknown>) =>
    expenseInputSchema.safeParse({ ...base, title: "スーパー", ...fields });

  it("(a) rejects a missing, empty, or whitespace-only title", () => {
    expect(expenseInputSchema.safeParse(base).success).toBe(false);
    expect(parse({ title: "" }).success).toBe(false);
    expect(parse({ title: "   " }).success).toBe(false);
  });

  it("(b) trims the title", () => {
    const result = parse({ title: "  スーパー  " });
    expect(result.success && result.data.title).toBe("スーパー");
  });

  it("(c) accepts 50 characters and rejects 51", () => {
    expect(parse({ title: "あ".repeat(50) }).success).toBe(true);
    expect(parse({ title: "あ".repeat(51) }).success).toBe(false);
  });

  it("(d) counts visible characters, so 50 emoji are accepted", () => {
    expect(parse({ title: "🍙".repeat(50) }).success).toBe(true);
    expect(parse({ title: "🍙".repeat(51) }).success).toBe(false);
  });

  it("(e) rejects a title containing a line break", () => {
    expect(parse({ title: "スー\nパー" }).success).toBe(false);
  });

  it("(f) defaults memo to an empty string", () => {
    const result = parse({});
    expect(result.success && result.data.memo).toBe("");
  });

  it("(g) trims memo, so whitespace and line breaks only become empty", () => {
    const trimmed = parse({ memo: "  野菜\n○○店  " });
    expect(trimmed.success && trimmed.data.memo).toBe("野菜\n○○店");
    const blank = parse({ memo: " \n \n " });
    expect(blank.success && blank.data.memo).toBe("");
  });

  it("(h) keeps line breaks and blank lines inside memo", () => {
    const result = parse({ memo: "a\n\nb" });
    expect(result.success && result.data.memo).toBe("a\n\nb");
  });

  it("(i) accepts 200 characters including line breaks and rejects 201", () => {
    const withBreaks = `${"あ".repeat(99)}\n${"い".repeat(100)}`; // 99 + 改行1 + 100 = 200
    expect(parse({ memo: withBreaks }).success).toBe(true);
    expect(parse({ memo: `${withBreaks}う` }).success).toBe(false);
  });

  it("(j) does not keep description", () => {
    const result = parse({ description: "古い内容" });
    expect(result.success).toBe(true);
    expect(result.success && "description" in result.data).toBe(false);
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

  it("(k) accepts an empty memo to clear it", () => {
    const result = expenseUpdateSchema.safeParse({ memo: "" });
    expect(result.success && result.data.memo).toBe("");
  });

  it("(l) leaves memo out when it is not sent", () => {
    const result = expenseUpdateSchema.safeParse({ amount: 2000 });
    expect(result.success && "memo" in result.data).toBe(false);
  });

  it("(m) validates the title the same way as when adding", () => {
    expect(expenseUpdateSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(expenseUpdateSchema.safeParse({ title: "あ".repeat(51) }).success).toBe(false);
    expect(expenseUpdateSchema.safeParse({ title: "スー\nパー" }).success).toBe(false);
    expect(expenseUpdateSchema.safeParse({ title: "ドラッグストア" }).success).toBe(true);
  });
});

// 002 FR-007: 設定額は1円以上の整数
describe("monthlyBudgetInputSchema", () => {
  it.each([0, -1, 1.5])("rejects amount %s", (amount) => {
    expect(monthlyBudgetInputSchema.safeParse({ amount }).success).toBe(false);
  });

  it.each([1, 20000])("accepts amount %s", (amount) => {
    expect(monthlyBudgetInputSchema.safeParse({ amount }).success).toBe(true);
  });
});
