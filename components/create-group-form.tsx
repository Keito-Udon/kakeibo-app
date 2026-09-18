"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { postJson } from "@/lib/fetcher";

export function CreateGroupForm() {
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
      router.refresh();
    } catch {
      setError("グループの作成に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
      <h1 className="text-xl font-bold">グループを作成</h1>
      <p className="text-sm text-gray-600">
        まだどのグループにも参加していません。新しくグループを作成するか、パートナーからの招待リンクを開いてください。
      </p>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1">
          <span>グループ名</span>
          <input
            data-testid="create-group-name"
            className="border rounded px-2 py-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        {error && <p className="text-red-600">{error}</p>}
        <button
          data-testid="create-group-submit"
          type="submit"
          disabled={submitting}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          作成する
        </button>
      </form>
    </main>
  );
}
