"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";

import { HeaderMenu } from "@/components/header-menu";
import type { MonthSummaryResponse } from "@/lib/budget";
import { buildMonthGrid } from "@/lib/calendar";
import { addMonths } from "@/lib/date";
import { fetcher } from "@/lib/fetcher";
import { formatDayAmount, formatYearMonth, formatYen } from "@/lib/format";

// 他メンバーの変更を数秒以内に反映する（FR-021, research.md #8）
const POLL_INTERVAL_MS = 3000;
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function monthSummaryKey(groupId: string, yearMonth: string) {
  return `/api/groups/${groupId}/months/${yearMonth}`;
}

export function MonthCalendar({
  groupId,
  groupName,
  yearMonth,
  today,
}: {
  groupId: string;
  groupName: string;
  yearMonth: string;
  today: string;
}) {
  const { data } = useSWR<MonthSummaryResponse>(monthSummaryKey(groupId, yearMonth), fetcher, {
    refreshInterval: POLL_INTERVAL_MS,
  });

  const remaining = data?.remaining ?? null;
  const isOverBudget = remaining !== null && remaining < 0;

  return (
    <main
      data-testid="calendar"
      data-group-id={groupId}
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pb-12 pt-4"
    >
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          {/* 選択中のグループ名（FR-029） */}
          <p data-testid="calendar-group-name" className="text-sm text-muted">
            {groupName}
          </p>
          <HeaderMenu />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Link
            data-testid="calendar-prev"
            href={`/months/${addMonths(yearMonth, -1)}`}
            aria-label="前の月"
            className="rounded-lg p-2 text-muted hover:bg-surface hover:text-foreground"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Link>
          {/* 年月をタップするとその月の予算変更画面へ（FR-006） */}
          <h1 className="text-xl font-bold text-foreground">
            <Link
              data-testid="calendar-year-month"
              href={`/months/${yearMonth}/budget`}
              className="rounded-lg px-2 py-1 underline-offset-4 hover:underline"
            >
              {formatYearMonth(yearMonth)}
            </Link>
          </h1>
          <Link
            data-testid="calendar-next"
            href={`/months/${addMonths(yearMonth, 1)}`}
            aria-label="次の月"
            className="rounded-lg p-2 text-muted hover:bg-surface hover:text-foreground"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </Link>
        </div>
        <p
          data-testid="calendar-remaining"
          data-negative={isOverBudget ? "true" : "false"}
          className="text-center"
        >
          {data === undefined ? (
            <span className="text-sm text-muted">読み込み中…</span>
          ) : remaining === null ? (
            <span className="text-lg font-semibold text-muted">予算なし</span>
          ) : (
            <>
              <span className="text-sm text-muted">残額 </span>
              <span
                className={`text-3xl font-bold ${isOverBudget ? "text-danger" : "text-foreground"}`}
              >
                {formatYen(remaining)}
              </span>
            </>
          )}
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="grid grid-cols-7 border-b border-border text-center text-xs text-muted">
          {WEEKDAYS.map((weekday, i) => (
            <div
              key={weekday}
              className={`py-2 ${i === 0 ? "text-danger" : ""} ${i === 6 ? "text-primary" : ""}`}
            >
              {weekday}
            </div>
          ))}
        </div>
        {buildMonthGrid(yearMonth).map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.map((date, dayIndex) =>
              date === null ? (
                <div key={`blank-${dayIndex}`} className="min-h-16 bg-background/50" />
              ) : (
                <DayCell
                  key={date}
                  date={date}
                  amount={data?.dailyTotals[date]}
                  isToday={date === today}
                />
              ),
            )}
          </div>
        ))}
      </div>

      {/* 支出追加。表示中の月に関わらず支出日の初期値は今日（FR-018） */}
      <Link
        data-testid="calendar-add"
        href={`/expenses/new?date=${today}`}
        aria-label="支出を追加"
        className="fixed bottom-6 right-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary-hover"
      >
        <Plus className="size-6" aria-hidden="true" />
      </Link>
    </main>
  );
}

// マスをタップするとその日の詳細へ（FR-016）
function DayCell({
  date,
  amount,
  isToday,
}: {
  date: string;
  amount: number | undefined;
  isToday: boolean;
}) {
  return (
    <Link
      data-testid={`calendar-day-${date}`}
      href={`/days/${date}`}
      className="flex min-h-16 flex-col items-center gap-1 border-r border-border p-1 last:border-r-0 hover:bg-background"
    >
      <span
        className={`flex size-6 items-center justify-center rounded-full text-xs ${
          isToday ? "bg-primary font-bold text-primary-foreground" : "text-foreground"
        }`}
      >
        {Number(date.slice(8))}
      </span>
      {amount !== undefined && (
        <span
          data-testid={`calendar-day-amount-${date}`}
          className="text-[11px] font-medium text-foreground"
        >
          {formatDayAmount(amount)}
        </span>
      )}
    </Link>
  );
}
