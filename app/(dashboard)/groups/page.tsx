import { GroupSwitcher } from "@/components/group-switcher";
import { requireActiveGroup } from "@/lib/active-group";
import { currentYearMonthJst } from "@/lib/date";
import { getUserGroups } from "@/lib/groups";

// グループ切り替え画面（FR-027）
export default async function GroupsPage() {
  const { userId, group } = await requireActiveGroup();
  const groups = await getUserGroups(userId);
  return (
    <GroupSwitcher
      groups={groups}
      selectedGroupId={group.id}
      backHref={`/months/${currentYearMonthJst()}`}
    />
  );
}
