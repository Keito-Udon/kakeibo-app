"use client";

import { useActionState } from "react";

import { loginAction } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(loginAction, null);

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
      <h1 className="text-xl font-bold">ログイン</h1>
      <form className="flex flex-col gap-3" action={formAction}>
        <label className="flex flex-col gap-1">
          <span>メールアドレス</span>
          <input
            data-testid="login-email"
            name="email"
            type="email"
            className="border rounded px-2 py-1"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>パスワード</span>
          <input
            data-testid="login-password"
            name="password"
            type="password"
            className="border rounded px-2 py-1"
            required
          />
        </label>
        {error && <p className="text-red-600">{error}</p>}
        <button
          data-testid="login-submit"
          type="submit"
          disabled={pending}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          ログイン
        </button>
      </form>
    </main>
  );
}
