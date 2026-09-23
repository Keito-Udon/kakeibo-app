import { daysInMonth, weekdayOfFirstDay } from "@/lib/date";

// 日曜始まり7列の月グリッド。各マスは "YYYY-MM-DD"、月の前後の空マスは null
export function buildMonthGrid(yearMonth: string): (string | null)[][] {
  const cells: (string | null)[] = Array(weekdayOfFirstDay(yearMonth)).fill(null);
  for (let day = 1; day <= daysInMonth(yearMonth); day++) {
    cells.push(`${yearMonth}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
