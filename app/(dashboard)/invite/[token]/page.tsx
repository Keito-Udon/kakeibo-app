import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { InviteNotFoundError, joinGroupByToken } from "@/lib/invites";

export default async function InviteJoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const { token } = await params;

  try {
    await joinGroupByToken(session.user.id, token);
  } catch (error) {
    if (error instanceof InviteNotFoundError) {
      return (
        <main className="mx-auto max-w-sm p-8">
          <p data-testid="invite-error">この招待リンクは無効か、期限切れです。</p>
        </main>
      );
    }
    throw error;
  }

  redirect("/");
}
