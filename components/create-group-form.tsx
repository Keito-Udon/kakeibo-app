"use client";

import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { ErrorMessage } from "@/components/ui/message";
import { postJson } from "@/lib/fetcher";

// グループ作成画面（FR-026）。作成したグループが選択中になり、振り分け（/）が初回の予算画面へ案内する
// backHref は所属グループがあるときの戻り先（カレンダー）。未所属なら戻る先はない
export function CreateGroupForm({ backHref }: { backHref: string | null }) {
  const hasGroup = backHref !== null;
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await postJson("/api/groups", { name });
      router.push("/");
    } catch {
      setError("グループの作成に失敗しました");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      {hasGroup && (
        <Link
          data-testid="groups-new-back"
          href={backHref}
          className="flex w-full max-w-sm items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          カレンダーに戻る
        </Link>
      )}

      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Users className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold">グループを作成</h1>
        <p className="max-w-xs text-sm text-muted">
          {hasGroup
            ? "新しいグループを作成します。今のグループからは抜けず、メニューの「グループ切り替え」で行き来できます。"
            : "まだどのグループにも参加していません。新しくグループを作成するか、パートナーからの招待リンクを開いてください。"}
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field label="グループ名">
            <Input
              data-testid="create-group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="〇〇家"
              required
            />
          </Field>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <Button data-testid="create-group-submit" type="submit" loading={submitting}>
            作成する
          </Button>
        </form>
      </Card>
    </main>
  );
}
