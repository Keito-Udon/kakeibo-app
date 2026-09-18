"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";

export async function loginAction(_prevState: string | null, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      return "メールアドレスまたはパスワードが違います";
    }
    throw error;
  }
}
