import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getMonthSummary } from "@/lib/budget";
import { isValidYearMonth } from "@/lib/date";
import { isGroupMember } from "@/lib/groups";

// カレンダー画面の表示に必要な値（予算・繰越・残額・日別合計）。SWRのポーリング対象（FR-013, FR-014）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string; yearMonth: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { groupId, yearMonth } = await params;
  if (!(await isGroupMember(session.user.id, groupId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!isValidYearMonth(yearMonth)) {
    return NextResponse.json({ error: `invalid yearMonth: ${yearMonth}` }, { status: 400 });
  }

  return NextResponse.json(await getMonthSummary(groupId, yearMonth));
}
