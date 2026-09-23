import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { isGroupMember } from "@/lib/groups";
import { setMonthlyBudget } from "@/lib/budget";
import { currentYearMonthJst } from "@/lib/date";

// 001の旧画面のための一時的な互換エンドポイント。今月（日本時間）の設定額として保存する。
// 新画面は PUT /api/groups/{groupId}/months/{yearMonth}/budget を使う。Phase 7（T061）で削除する。
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { groupId } = await params;
  if (!(await isGroupMember(session.user.id, groupId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const amount = body?.monthlyBudget;
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "monthlyBudget must be a positive integer" }, { status: 400 });
  }

  await setMonthlyBudget(groupId, currentYearMonthJst(), amount, session.user.id);

  return NextResponse.json({ groupId, monthlyBudget: amount });
}
