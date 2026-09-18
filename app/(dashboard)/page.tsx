
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateGroupForm } from "@/components/create-group-form";
import { Dashboard } from "@/components/dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }
  const userId = session.user.id;

  const membership = await prisma.groupMember.findFirst({
    where: { userId },
    include: { group: { include: { members: { include: { user: true } } } } },
  });

  if (!membership) {
    return <CreateGroupForm />;
  }

  const members = membership.group.members.map((m) => ({
    id: m.user.id,
    displayName: m.user.displayName,
  }));

  return (
    <Dashboard
      groupId={membership.group.id}
      groupName={membership.group.name}
      members={members}
    />
  );
}
