import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { NotGroupMemberError, selectGroup } from "@/lib/groups";

// 選択中のグループを切り替える（FR-027, FR-028）
export async function PUT(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const groupId = typeof body?.groupId === "string" ? body.groupId : "";
  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  try {
    await selectGroup(session.user.id, groupId);
  } catch (error) {
    if (error instanceof NotGroupMemberError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    throw error;
  }

  return NextResponse.json({ groupId });
}
