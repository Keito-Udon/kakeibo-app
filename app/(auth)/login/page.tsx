"use client";

import { PiggyBank } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { ErrorMessage } from "@/components/ui/message";

import { loginAction } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(loginAction, null);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <PiggyBank className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold">ログイン</h1>
        <p className="text-sm text-muted">共有家計簿におかえりなさい</p>
      </div>

      <Card className="w-full max-w-sm">
        <form className="flex flex-col gap-4" action={formAction}>
          <Field label="メールアドレス">
            <Input data-testid="login-email" name="email" type="email" required />
          </Field>
          <Field label="パスワード">
            <Input data-testid="login-password" name="password" type="password" required />
          </Field>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <Button data-testid="login-submit" type="submit" loading={pending}>
            ログイン
          </Button>
        </form>
      </Card>

      <p className="text-sm text-muted">
        アカウントをお持ちでないですか？{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          アカウント作成
        </Link>
      </p>
    </main>
  );
}
