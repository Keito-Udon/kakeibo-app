import { redirect } from "next/navigation";

import { auth, signOut } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex justify-end p-4">
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            data-testid="logout-button"
            type="submit"
            className="text-sm text-gray-600 underline"
          >
            ログアウト
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
