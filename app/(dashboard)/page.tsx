import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { hasAnyBudget } from "@/lib/budget";
import { currentYearMonthJst } from "@/lib/date";
import { resolveSelectedGroup } from "@/lib/groups";

// ログイン後の振り分け。画面を持たない（FR-001, contracts/screens.md「振り分け」）
export default async function RootPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  // (1) どのグループにも所属していなければグループ作成画面へ
  const group = await resolveSelectedGroup(session.user.id);
  if (!group) {
    redirect("/groups/new");
  }

  // (2) グループで一度も予算が設定されていなければ初回の予算決定画面へ、(3) それ以外はカレンダーへ
  const thisMonth = currentYearMonthJst();
  if (!(await hasAnyBudget(group.id))) {
    redirect(`/months/${thisMonth}/budget`);
  }
  redirect(`/months/${thisMonth}`);
}
