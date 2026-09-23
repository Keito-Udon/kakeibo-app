"use client";

import { ArrowLeftRight, Link2, LogOut, MoreHorizontal, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { logout } from "@/app/(dashboard)/actions";

const itemClass =
  "flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-foreground hover:bg-background";

// 3点リーダーメニュー（FR-023）。画面ではなく、移動先を選ぶだけの開閉式メニュー（research.md #9）
export function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // メニューの外側をタップしたら閉じる
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        data-testid="header-menu-button"
        type="button"
        aria-label="メニュー"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-2 text-muted hover:bg-surface hover:text-foreground"
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <Link data-testid="header-menu-invite" href="/invite-link" className={itemClass}>
            <Link2 className="size-4 text-muted" aria-hidden="true" />
            招待リンク
          </Link>
          <Link data-testid="header-menu-create-group" href="/groups/new" className={itemClass}>
            <Users className="size-4 text-muted" aria-hidden="true" />
            グループ作成
          </Link>
          <Link data-testid="header-menu-switch-group" href="/groups" className={itemClass}>
            <ArrowLeftRight className="size-4 text-muted" aria-hidden="true" />
            グループ切り替え
          </Link>
          <form action={logout} className="border-t border-border">
            <button data-testid="header-menu-logout" type="submit" className={itemClass}>
              <LogOut className="size-4 text-muted" aria-hidden="true" />
              ログアウト
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
