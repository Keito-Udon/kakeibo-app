import { InviteLink } from "@/components/invite-link";
import { requireActiveGroup } from "@/lib/active-group";
import { currentYearMonthJst } from "@/lib/date";

// 招待リンク画面（FR-024）
export default async function InviteLinkPage() {
  const { group } = await requireActiveGroup();
  return (
    <InviteLink
      groupId={group.id}
      groupName={group.name}
      backHref={`/months/${currentYearMonthJst()}`}
    />
  );
}
