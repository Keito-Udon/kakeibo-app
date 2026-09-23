import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveSelectedGroup } from "@/lib/groups";
import { CreateGroupForm } from "@/components/create-group-form";
import { Dashboard } from "@/components/dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const group = await resolveSelectedGroup(session.user.id);
  if (!group) {
    return <CreateGroupForm />;
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
