import { describe, expect, it } from "vitest";

import {
  addMonths,
  currentYearMonthJst,
  daysInMonth,
  isValidDate,
  isValidYearMonth,
  todayJst,
  yearMonthOf,
} from "@/lib/date";

// research.md #4: 日付・月は日本時間基準の文字列で扱う
describe("todayJst / currentYearMonthJst", () => {
  it("UTCの前日15時以降は日本時間では翌日になる", () => {
    expect(todayJst(new Date("2026-09-22T15:30:00Z"))).toBe("2026-09-23");
  });

  it("UTCの14:59は日本時間の23:59で同じ日のまま", () => {
    expect(todayJst(new Date("2026-09-23T14:59:00Z"))).toBe("2026-09-23");
  });

  it("月末の境界も日本時間で判定する", () => {
    expect(currentYearMonthJst(new Date("2026-09-30T15:00:00Z"))).toBe("2026-10");
    expect(currentYearMonthJst(new Date("2026-09-30T14:59:00Z"))).toBe("2026-09");
  });
});

describe("isValidYearMonth", () => {
  it.each(["2026-09", "2026-01", "2026-12"])("%s を受け付ける", (value) => {
    expect(isValidYearMonth(value)).toBe(true);
  });

  it.each(["2026-13", "2026-00", "2026-9", "2026/09", "", "abcd-ef"])("%s を拒否する", (value) => {
    expect(isValidYearMonth(value)).toBe(false);
  });
});

describe("isValidDate", () => {
  it.each(["2026-02-28", "2028-02-29", "2026-09-30"])("%s を受け付ける", (value) => {
    expect(isValidDate(value)).toBe(true);
  });

  it.each(["2026-02-29", "2026-02-30", "2026-09-31", "2026-9-5", "2026/09/05", ""])(
    "%s を拒否する",
    (value) => {
      expect(isValidDate(value)).toBe(false);
    },
  );
});

describe("addMonths", () => {
  it("年をまたいで進める・戻す", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-09", 0)).toBe("2026-09");
    expect(addMonths("2026-09", 15)).toBe("2027-12");
  });
});

describe("daysInMonth / yearMonthOf", () => {
  it("月の日数を返す", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
    expect(daysInMonth("2026-09")).toBe(30);
    expect(daysInMonth("2026-12")).toBe(31);
  });

  it("日付から年月を取り出す", () => {
    expect(yearMonthOf("2026-09-05")).toBe("2026-09");
  });
});
