"use client";

import { PiggyBank } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { ErrorMessage } from "@/components/ui/message";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(
        res.status === 409
          ? "このメールアドレスは既に登録されています"
          : (data?.error ?? "サインアップに失敗しました"),
      );
      return;
    }

    router.push("/login");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <PiggyBank className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold">アカウント作成</h1>
        <p className="text-sm text-muted">2人で使う共有家計簿をはじめましょう</p>
      </div>

      <Card className="w-full max-w-sm">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field label="表示名">
            <Input
              data-testid="signup-displayname"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="はなこ"
              required
            />
          </Field>
          <Field label="メールアドレス">
            <Input
              data-testid="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </Field>
          <Field label="パスワード">
            <Input
              data-testid="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上"
              required
              minLength={8}
            />
          </Field>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <Button data-testid="signup-submit" type="submit" loading={submitting}>
            アカウントを作成する
          </Button>
        </form>
      </Card>

      <p className="text-sm text-muted">
        すでにアカウントをお持ちですか？{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          ログイン
        </Link>
      </p>
    </main>
  );
}
