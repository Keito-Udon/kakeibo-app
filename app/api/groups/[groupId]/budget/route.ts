import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isGroupMember } from "@/lib/groups";
import { budgetInputSchema } from "@/lib/validation/expense";
import { logger } from "@/lib/logger";

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
  const parsed = budgetInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const group = await prisma.group.update({
    where: { id: groupId },
    data: { monthlyBudget: parsed.data.monthlyBudget },
  });

  logger.info("group.budget.update", {
    groupId,
    userId: session.user.id,
    monthlyBudget: group.monthlyBudget,
  });

  return NextResponse.json({ groupId, monthlyBudget: group.monthlyBudget });
}
