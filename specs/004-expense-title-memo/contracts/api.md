# API Contract: 支出のタイトルとメモ

`specs/002-calendar-monthly-budget/contracts/api.md` からの差分。支出記録の `description` を `title` に
置き換え、`memo` を加える。エンドポイントとステータスコードは変更しない。

## `POST /api/groups/{groupId}/expenses`

- **Request**: `{ amount, title: string, memo?: string, paidById, paymentMethod, spentOn }`
  - `title`: 前後の空白を除いて1〜50文字、改行なし
  - `memo`: 省略時は `""`。前後の空白を除いて200文字以下、改行可
- **Response 400**: 002の条件に加え、`title` の欠落・空・51文字以上・改行を含む、`memo` の201文字以上
- `description` は受け付けない（送られても無視する）

## `PATCH /api/groups/{groupId}/expenses/{expenseId}`

- **Request**: `{ amount?, title?, memo?, paidById?, paymentMethod?, spentOn? }`
  - `memo: ""` を送るとメモを消せる。`memo` を省略すると変更しない

## `GET /api/groups/{groupId}/days/{date}`

- 各支出の `description` が `title` と `memo` に替わる（その他は002と同じ）

## 型定義（参考）

```ts
type ExpenseRecord = {
  id: string;
  amount: number;
  title: string;   // 変更: description → title
  memo: string;    // 追加: "" はメモなし
  paidById: string;
  paymentMethod: "CASH" | "MOBILE";
  spentOn: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  updatedById: string | null;
};
```
