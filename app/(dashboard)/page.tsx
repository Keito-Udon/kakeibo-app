import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { hasAnyBudget } from "@/lib/budget";
import { currentYearMonthJst } from "@/lib/date";
import { prisma } from "@/lib/db";
import { resolveSelectedGroup } from "@/lib/groups";
import { Dashboard } from "@/components/dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  // FR-001(1): どのグループにも所属していなければグループ作成画面へ
  const group = await resolveSelectedGroup(session.user.id);
  if (!group) {
    redirect("/groups/new");
  }

  // FR-001(2): グループで一度も予算が設定されていなければ、初回の予算決定画面へ
  if (!(await hasAnyBudget(group.id))) {
    redirect(`/months/${currentYearMonthJst()}/budget`);
  }

  const memberships = await prisma.groupMember.findMany({
    where: { groupId: group.id },
    include: { user: true },
  });
  const members = memberships.map((m) => ({
    id: m.user.id,
    displayName: m.user.displayName,
  }));

  return <Dashboard groupId={group.id} groupName={group.name} members={members} />;
}
