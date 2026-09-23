// HTTPステータスを呼び出し側で判定できるようにする（例: 404 = 既に削除された支出）
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new HttpError(res.status, `request failed: ${res.status}`);
  }
  return res.json();
}

export async function sendJson<T>(
  method: "POST" | "PUT" | "PATCH",
  url: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new HttpError(
      res.status,
      data?.error ? JSON.stringify(data.error) : `request failed: ${res.status}`,
    );
  }
  return res.json();
}

export function postJson<T>(url: string, body: unknown): Promise<T> {
  return sendJson<T>("POST", url, body);
}
