const yenFormatter = new Intl.NumberFormat("ja-JP");

export function formatYen(amount: number): string {
  return `${yenFormatter.format(amount)}円`;
}

// 日付マスは幅が狭いため、1万円以上は万単位（小数第1位で四捨五入）にする（research.md #7）
export function formatDayAmount(amount: number): string {
  if (amount < 10000) {
    return yenFormatter.format(amount);
  }
  const man = Math.round(amount / 1000) / 10;
  return `${man}万`;
}

export function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return `${year}年${month}月`;
}
