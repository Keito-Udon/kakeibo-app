"use server";

import { signOut } from "@/lib/auth";

// メニューのログアウト（FR-025）。001で layout.tsx にあった処理を移設
export async function logout() {
  await signOut({ redirectTo: "/login" });
}
