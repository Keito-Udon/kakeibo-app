import type { Group } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { hasAnyBudget } from "@/lib/budget";
import { currentYearMonthJst } from "@/lib/date";
import { resolveSelectedGroup } from "@/lib/groups";

// グループ・予算の有無による画面の振り分け（FR-001, FR-003）。DBアクセスが要るため、Proxyではなく
// 各ページの冒頭で呼ぶ（research.md #3）。

export async function requireActiveGroup(): Promise<{ userId: string; group: Group }> {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }
  const userId = session.user.id;
  const group = await resolveSelectedGroup(userId);
  if (!group) {
    // 振り分け（/）がグループ作成へ案内する
    redirect("/");
  }
  return { userId, group };
}

export async function requireBudgetedGroup(): Promise<{ userId: string; group: Group }> {
  const active = await requireActiveGroup();
  if (!(await hasAnyBudget(active.group.id))) {
    redirect(`/months/${currentYearMonthJst()}/budget`);
  }
  return active;
}
