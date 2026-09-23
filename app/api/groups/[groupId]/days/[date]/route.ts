import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { isValidDate } from "@/lib/date";
import { getDayExpenses } from "@/lib/expenses";
import { isGroupMember } from "@/lib/groups";

// 日別詳細画面の一覧。SWRのポーリング対象（FR-019, FR-021）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string; date: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { groupId, date } = await params;
  if (!(await isGroupMember(session.user.id, groupId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!isValidDate(date)) {
    return NextResponse.json({ error: `invalid date: ${date}` }, { status: 400 });
  }

  return NextResponse.json(await getDayExpenses(groupId, date));
}
