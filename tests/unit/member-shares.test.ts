import { describe, expect, it } from "vitest";

import { computeMemberShares } from "@/lib/member-spending";

// 003 data-model.md「メンバーごとの支払額」: 割合・並び順・色の割り当て
describe("computeMemberShares", () => {
  // グループへの参加順
  const members = [
    { userId: "a", displayName: "A" },
    { userId: "b", displayName: "B" },
    { userId: "c", displayName: "C" },
  ];

  it("(a) 支払額のないメンバーも amount: 0 で含める（FR-003）", () => {
    const shares = computeMemberShares(members, { a: 1000 });
    expect(shares.map((s) => [s.userId, s.amount])).toEqual([
      ["a", 1000],
      ["b", 0],
      ["c", 0],
    ]);
  });

  it("(b) 割合は支払額 / 月の支出合計 を四捨五入した整数%", () => {
    const shares = computeMemberShares(members.slice(0, 2), { a: 3000, b: 1000 });
    expect(shares.map((s) => [s.userId, s.percent])).toEqual([
      ["a", 75],
      ["b", 25],
    ]);
  });

  it("(c) 丸めの結果、合計が100%にならなくてよい", () => {
    const shares = computeMemberShares(members, { a: 1, b: 1, c: 1 });
    expect(shares.map((s) => s.percent)).toEqual([33, 33, 33]);
    const twoThirds = computeMemberShares(members.slice(0, 2), { a: 2, b: 1 });
    expect(twoThirds.map((s) => s.percent)).toEqual([67, 33]);
  });

  it("(d) 月の支出合計が0なら全員の percent は null", () => {
    const shares = computeMemberShares(members, {});
    expect(shares.every((s) => s.amount === 0 && s.percent === null)).toBe(true);
  });

  it("(e) 支払額の多い順、同額なら参加順", () => {
    const shares = computeMemberShares(members, { a: 500, b: 2000, c: 500 });
    expect(shares.map((s) => s.userId)).toEqual(["b", "a", "c"]);
  });

  it("(f) colorIndex は並び替えても参加順のまま", () => {
    const shares = computeMemberShares(members, { c: 3000, b: 2000, a: 1000 });
    expect(shares.map((s) => [s.userId, s.colorIndex])).toEqual([
      ["c", 2],
      ["b", 1],
      ["a", 0],
    ]);
  });

  it("(g) 全員の支払額の合計は月の支出合計と一致する（SC-002）", () => {
    const totals = { a: 1234, b: 5678, c: 9 };
    const shares = computeMemberShares(members, totals);
    expect(shares.reduce((sum, s) => sum + s.amount, 0)).toBe(1234 + 5678 + 9);
    expect(shares.map((s) => s.displayName)).toEqual(["B", "A", "C"]);
  });
});
