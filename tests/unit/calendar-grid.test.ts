import { describe, expect, it } from "vitest";

import { buildMonthGrid } from "@/lib/calendar";

// FR-014 / research.md #7: 日曜始まり7列の月グリッド。空マスは null
describe("buildMonthGrid", () => {
  it("2026年9月は火曜始まりなので先頭に空マスが2つ", () => {
    const weeks = buildMonthGrid("2026-09");
    expect(weeks[0]).toEqual([
      null,
      null,
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
    ]);
    const days = weeks.flat().filter((d) => d !== null);
    expect(days).toHaveLength(30);
    expect(days.at(-1)).toBe("2026-09-30");
  });

  it("2026年2月は日曜始まり・28日なのでちょうど4週", () => {
    const weeks = buildMonthGrid("2026-02");
    expect(weeks).toHaveLength(4);
    expect(weeks[0][0]).toBe("2026-02-01");
    expect(weeks[3][6]).toBe("2026-02-28");
  });

  it("すべての週が7マスで、最終週の余りは空マス", () => {
    const weeks = buildMonthGrid("2026-09");
    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }
    // 9/30 は水曜。木〜土は空マス
    expect(weeks.at(-1)?.slice(4)).toEqual([null, null, null]);
  });
});
