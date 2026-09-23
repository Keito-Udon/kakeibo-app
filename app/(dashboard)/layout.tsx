import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

// ログイン必須の画面の共通レイアウト。ログアウトはカレンダーのメニューから行う（FR-025）
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return <div className="flex min-h-dvh flex-col">{children}</div>;
}
