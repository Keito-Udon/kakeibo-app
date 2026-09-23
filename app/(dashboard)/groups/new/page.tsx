import { redirect } from "next/navigation";

import { CreateGroupForm } from "@/components/create-group-form";
import { auth } from "@/lib/auth";
import { currentYearMonthJst } from "@/lib/date";
import { resolveSelectedGroup } from "@/lib/groups";

// グループ作成画面（FR-026）。未所属でも開ける
export default async function NewGroupPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }
  const group = await resolveSelectedGroup(session.user.id);
  return <CreateGroupForm backHref={group ? `/months/${currentYearMonthJst()}` : null} />;
}
