import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { InviteNotFoundError, joinGroupByToken } from "@/lib/invites";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  try {
    const groupId = await joinGroupByToken(session.user.id, token);
    return NextResponse.json({ groupId }, { status: 200 });
  } catch (error) {
    if (error instanceof InviteNotFoundError) {
      return NextResponse.json({ error: "invite not found" }, { status: 404 });
    }
    throw error;
  }
}
