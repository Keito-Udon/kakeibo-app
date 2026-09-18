import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const monthlyBudget =
    typeof body.monthlyBudget === "number" ? body.monthlyBudget : undefined;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const group = await prisma.group.create({
    data: {
      name,
      monthlyBudget,
      members: { create: { userId: session.user.id } },
    },
  });

  logger.info("group.create", { groupId: group.id, userId: session.user.id });

  return NextResponse.json({ groupId: group.id }, { status: 201 });
}
