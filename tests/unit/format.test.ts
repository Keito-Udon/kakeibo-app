import { describe, expect, it } from "vitest";

import { formatDayAmount, formatYearMonth, formatYen } from "@/lib/format";

// research.md #7: 日付マスの金額は1万円未満はカンマ区切り、1万円以上は万単位（小数第1位）
describe("formatDayAmount", () => {
  it.each([
    [1500, "1,500"],
    [9999, "9,999"],
    [10000, "1万"],
    [12345, "1.2万"],
    [15050, "1.5万"],
    [123456, "12.3万"],
  ])("%d → %s", (amount, expected) => {
    expect(formatDayAmount(amount)).toBe(expected);
  });
});

describe("formatYen", () => {
  it.each([
    [16500, "16,500円"],
    [0, "0円"],
    [-3000, "-3,000円"],
  ])("%d → %s", (amount, expected) => {
    expect(formatYen(amount)).toBe(expected);
  });
});

describe("formatYearMonth", () => {
  it("年月を「2026年9月」の形で表示する", () => {
    expect(formatYearMonth("2026-09")).toBe("2026年9月");
    expect(formatYearMonth("2027-12")).toBe("2027年12月");
  });
});
