// 日付は "YYYY-MM-DD"、年月は "YYYY-MM" の文字列で扱い、「今日」「今月」は日本時間で判定する
// （research.md #4）。月の計算は Date.UTC で行い、サーバーのタイムゾーン設定に依存させない。

const jstDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const YEAR_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])-(\d{2})$/;

// en-CA は "2026-09-23" 形式で出力する
export function todayJst(now: Date = new Date()): string {
  return jstDateFormatter.format(now);
}

export function currentYearMonthJst(now: Date = new Date()): string {
  return yearMonthOf(todayJst(now));
}

export function isValidYearMonth(value: string): boolean {
  return YEAR_MONTH_PATTERN.test(value);
}

export function isValidDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const day = Number(match[3]);
  return day >= 1 && day <= daysInMonth(`${match[1]}-${match[2]}`);
}

export function yearMonthOf(date: string): string {
  return date.slice(0, 7);
}

function parseYearMonth(yearMonth: string): { year: number; month: number } {
  const [year, month] = yearMonth.split("-").map(Number);
  return { year, month };
}

export function addMonths(yearMonth: string, months: number): string {
  const { year, month } = parseYearMonth(yearMonth);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function daysInMonth(yearMonth: string): number {
  const { year, month } = parseYearMonth(yearMonth);
  // 翌月の0日 = その月の末日
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// 0 = 日曜
export function weekdayOfFirstDay(yearMonth: string): number {
  const { year, month } = parseYearMonth(yearMonth);
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}
