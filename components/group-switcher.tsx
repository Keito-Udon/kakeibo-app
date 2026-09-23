"use client";

import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorMessage } from "@/components/ui/message";
import { sendJson } from "@/lib/fetcher";

// グループ切り替え画面（FR-027）。選ぶと振り分け（/）が、そのグループのカレンダーか初回の予算画面へ案内する
export function GroupSwitcher({
  groups,
  selectedGroupId,
  backHref,
}: {
  groups: { id: string; name: string }[];
  selectedGroupId: string;
  backHref: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleSelect(groupId: string) {
    setPendingId(groupId);
    setError(null);
    try {
      await sendJson("PUT", "/api/me/selected-group", { groupId });
      router.push("/");
    } catch {
      setError("グループの切り替えに失敗しました");
      setPendingId(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-4 px-4 pb-12 pt-4">
      <Link
        data-testid="groups-back"
        href={backHref}
        className="flex items-center gap-1 self-start text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        カレンダーに戻る
      </Link>
      <h1 className="text-xl font-bold text-foreground">グループ切り替え</h1>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <ul className="flex flex-col gap-2">
        {groups.map((group) => {
          const selected = group.id === selectedGroupId;
          return (
            <li key={group.id}>
              <button
                data-testid="group-switch-item"
                data-selected={selected ? "true" : "false"}
                type="button"
                disabled={pendingId !== null}
                onClick={() => handleSelect(group.id)}
                className={`flex w-full items-center justify-between rounded-xl border bg-surface p-4 text-left shadow-sm hover:bg-background disabled:opacity-60 ${
                  selected ? "border-primary" : "border-border"
                }`}
              >
                <span className="font-medium text-foreground">{group.name}</span>
                {selected && <Check className="size-5 text-primary" aria-label="選択中" />}
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
