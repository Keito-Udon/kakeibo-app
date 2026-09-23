"use client";

import { formatYen } from "@/lib/format";

// contracts/api.md の memberTotals の要素（lib/member-spending.ts の MemberTotal と同じ形）
type MemberTotal = {
  userId: string;
  displayName: string;
  amount: number;
  percent: number | null;
  colorIndex: number;
};

// グループへの参加順で色を割り当てる（research.md #4）。7人目以降は先頭から繰り返す
const BAR_COLORS = [
  "bg-sky-500",
  "bg-rose-400",
  "bg-amber-400",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-orange-500",
];

// カレンダーの左に置く、メンバーごとの支払額と割合（contracts/screens.md）。名前と金額は省略しない
export function MemberSpending({ memberTotals }: { memberTotals: MemberTotal[] | undefined }) {
  return (
    <aside data-testid="member-spending" className="flex w-44 shrink-0 flex-col gap-2">
      {memberTotals?.map((member) => (
        <div
          key={member.userId}
          data-testid="member-spending-item"
          className="rounded-lg border border-border bg-surface p-1.5 shadow-sm"
        >
          <p
            data-testid="member-spending-name"
            className="break-all text-xs font-medium leading-tight text-foreground"
          >
            {member.displayName}
          </p>
          <p
            data-testid="member-spending-amount"
            className="break-all text-xs font-bold text-foreground"
          >
            {formatYen(member.amount)}
          </p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background">
            <div
              className={`h-full ${BAR_COLORS[member.colorIndex % BAR_COLORS.length]}`}
              style={{ width: `${member.percent ?? 0}%` }}
            />
          </div>
          <p data-testid="member-spending-percent" className="text-[10px] text-muted">
            {member.percent === null ? "支出なし" : `${member.percent}%`}
          </p>
        </div>
      ))}
    </aside>
  );
}
