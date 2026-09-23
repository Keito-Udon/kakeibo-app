"use client";

import { ArrowLeft, Link2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { postJson } from "@/lib/fetcher";

// 招待リンク画面（FR-024）。001の InviteSection（発行・コピー）を独立した画面に移したもの
export function InviteLink({
  groupId,
  groupName,
  backHref,
}: {
  groupId: string;
  groupName: string;
  backHref: string;
}) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await postJson<{ inviteUrl: string }>(`/api/groups/${groupId}/invite`, {});
      setInviteUrl(result.inviteUrl);
      setCopied(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      // クリップボードAPIが使えない環境では、URLをそのまま表示しているのでコピーは手動で行う
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-4 px-4 pb-12 pt-4">
      <Link
        data-testid="invite-link-back"
        href={backHref}
        className="flex items-center gap-1 self-start text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        カレンダーに戻る
      </Link>

      <Card>
        <CardTitle>「{groupName}」に招待</CardTitle>
        <p className="mb-3 text-sm text-muted">
          招待リンクを共有すると、リンクを開いた人がこのグループに参加できます。発行し直すと、前のリンクは使えなくなります。
        </p>
        <Button variant="secondary" onClick={handleGenerate} loading={loading}>
          <Link2 className="size-4" aria-hidden="true" />
          <span data-testid="invite-generate">招待リンクを発行</span>
        </Button>
        {inviteUrl && (
          <div className="mt-3 flex flex-col gap-2 rounded-lg bg-background p-3">
            <p data-testid="invite-url" className="break-all text-sm text-foreground">
              {inviteUrl}
            </p>
            <Button
              data-testid="invite-copy"
              variant="secondary"
              type="button"
              onClick={handleCopy}
            >
              {copied ? "コピーしました" : "コピー"}
            </Button>
          </div>
        )}
      </Card>
    </main>
  );
}
