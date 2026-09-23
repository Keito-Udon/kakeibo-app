import { describe, expect, it } from "vitest";

import { computeMonthSummary } from "@/lib/budget";

// FR-008, FR-010〜FR-012 / data-model.md「導出値」: 設定額の引き継ぎと、前月残額の繰越
describe("computeMonthSummary", () => {
  it("(a) 予算が1件もなければ予算なし", () => {
    const summary = computeMonthSummary([], { "2026-09": 1000 }, "2026-09");
    expect(summary).toEqual({ budget: null, spent: 1000, remaining: null });
  });

  it("(b) 予算開始月より前の月は予算なし", () => {
    const budgets = [{ yearMonth: "2026-09", amount: 20000 }];
    const summary = computeMonthSummary(budgets, { "2026-08": 3000 }, "2026-08");
    expect(summary).toEqual({ budget: null, spent: 3000, remaining: null });
  });

  it("(c) 予算開始月の繰越は0円", () => {
    const budgets = [{ yearMonth: "2026-09", amount: 20000 }];
    const summary = computeMonthSummary(budgets, { "2026-09": 12000 }, "2026-09");
    expect(summary).toEqual({
      budget: { setAmount: 20000, carryover: 0, total: 20000 },
      spent: 12000,
      remaining: 8000,
    });
  });

  it("(d) 余りを翌月に繰り越し、設定額は前月から引き継ぐ", () => {
    const budgets = [{ yearMonth: "2026-09", amount: 20000 }];
    const summary = computeMonthSummary(budgets, { "2026-09": 15000 }, "2026-10");
    expect(summary).toEqual({
      budget: { setAmount: 20000, carryover: 5000, total: 25000 },
      spent: 0,
      remaining: 25000,
    });
  });

  it("(e) 超過分は翌月から差し引く", () => {
    const budgets = [{ yearMonth: "2026-09", amount: 20000 }];
    const summary = computeMonthSummary(budgets, { "2026-09": 23000 }, "2026-10");
    expect(summary.budget).toEqual({ setAmount: 20000, carryover: -3000, total: 17000 });
  });

  it("(f) 超過が続くとマイナスが積み重なる", () => {
    const budgets = [{ yearMonth: "2026-09", amount: 10000 }];
    const totals = { "2026-09": 13000, "2026-10": 12000 };
    // 9月: 残額 -3000 → 10月: 予算 7000, 残額 -5000 → 11月: 予算 5000
    const summary = computeMonthSummary(budgets, totals, "2026-11");
    expect(summary.budget).toEqual({ setAmount: 10000, carryover: -5000, total: 5000 });
  });

  it("(g) ある月の設定額を変えても前の月は変わらず、以降の月はその額を引き継ぐ", () => {
    const budgets = [
      { yearMonth: "2026-09", amount: 20000 },
      { yearMonth: "2026-10", amount: 25000 },
    ];
    expect(computeMonthSummary(budgets, {}, "2026-09").budget?.setAmount).toBe(20000);
    expect(computeMonthSummary(budgets, {}, "2026-10").budget?.setAmount).toBe(25000);
    expect(computeMonthSummary(budgets, {}, "2026-11").budget?.setAmount).toBe(25000);
  });

  it("(h) 支出のない未来の月にも繰越が伝わる（年をまたいでも）", () => {
    const budgets = [{ yearMonth: "2026-11", amount: 1000 }];
    // 11月・12月に1000円ずつ余り、翌年1月は 1000 + 2000
    const summary = computeMonthSummary(budgets, {}, "2027-01");
    expect(summary.budget).toEqual({ setAmount: 1000, carryover: 2000, total: 3000 });
  });

  it("(i) spent はその月の支出合計で、残額は予算 − 支出", () => {
    const budgets = [{ yearMonth: "2026-09", amount: 20000 }];
    const summary = computeMonthSummary(budgets, { "2026-09": 5000, "2026-10": 7000 }, "2026-10");
    expect(summary.spent).toBe(7000);
    expect(summary.remaining).toBe(35000 - 7000);
  });

  it("budgets の並び順に依存しない", () => {
    const budgets = [
      { yearMonth: "2026-10", amount: 25000 },
      { yearMonth: "2026-09", amount: 20000 },
    ];
    const summary = computeMonthSummary(budgets, { "2026-09": 20000 }, "2026-10");
    expect(summary.budget).toEqual({ setAmount: 25000, carryover: 0, total: 25000 });
  });
});
