# API Contract: 共有家計簿（Shared Budget）

Next.js API Routes（`app/api/**`）が公開するエンドポイント契約。すべて認証済みセッション（Auth.js）
が前提（未認証アクセスは401）。グループに属さないリソースへのアクセスは403/404とする（FR-007）。

## 認証

### `POST /api/auth/signup`（Auth.jsの外側で用意する独自エンドポイント）

- **Request**: `{ email: string, password: string, displayName: string }`
- **Response 201**: `{ userId: string }`
- **Response 400**: バリデーションエラー（email形式不正、パスワード短すぎ等）
- **Response 409**: emailが既に登録済み

### `POST /api/auth/[...nextauth]`

Auth.jsのCredentials Providerによるログイン/ログアウト。標準のAuth.jsセッションCookieを発行する。

## グループ

### `POST /api/groups`

- **Request**: `{ name: string, monthlyBudget?: number }`
- **Response 201**: `{ groupId: string }`
- 作成者は自動的にそのグループの `GroupMember` になる

### `PUT /api/groups/{groupId}/budget`

- **Request**: `{ monthlyBudget: number }`（FR-008）
- **Response 200**: `{ groupId: string, monthlyBudget: number }`
- **Response 403**: リクエストユーザーがそのグループのメンバーでない場合

### `POST /api/groups/{groupId}/invite`

招待リンク用トークンを発行（既存の有効なトークンがあれば失効させて再発行）。

- **Response 201**: `{ token: string, inviteUrl: string }`
- **Response 403**: リクエストユーザーがそのグループのメンバーでない場合

### `POST /api/invite/{token}`

招待リンク経由でグループに参加する（FR-004, FR-014）。

- **Response 200**: `{ groupId: string }`
- **Response 404**: トークンが存在しない、または失効済み

## 支出記録

### `GET /api/groups/{groupId}/expenses`

当該グループの支出記録一覧を取得する（FR-006）。SWRのポーリング対象（research.md #1）。

- **Response 200**: `{ expenses: ExpenseRecord[], monthlyBudget: number | null, currentMonthTotal: number, remaining: number | null }`
  （`remaining` は `monthlyBudget` が null の場合 null。FR-009, Edge Cases）
- **Response 403**: リクエストユーザーがそのグループのメンバーでない場合（FR-007）

### `POST /api/groups/{groupId}/expenses`

支出記録を追加する（FR-005）。

- **Request**: `{ amount: number, description: string, paidById: string, paymentMethod: "CASH" | "MOBILE" }`
- **Response 201**: `ExpenseRecord`
- **Response 400**: `amount <= 0`（FR-010）

### `PATCH /api/groups/{groupId}/expenses/{expenseId}`

支出記録を編集する。グループの誰でも編集可（FR-012）。

- **Request**: `{ amount?: number, description?: string, paidById?: string, paymentMethod?: "CASH" | "MOBILE" }`
- **Response 200**: `ExpenseRecord`
- **Response 404**: 対象の記録が既に削除されている場合（Edge Cases: 編集と削除の競合）

### `DELETE /api/groups/{groupId}/expenses/{expenseId}`

支出記録を削除する。グループの誰でも削除可（FR-012）。

- **Response 204**
- **Response 404**: 対象の記録が既に存在しない場合

## 型定義（参考）

```ts
type ExpenseRecord = {
  id: string;
  amount: number;
  description: string;
  paidById: string;
  paymentMethod: "CASH" | "MOBILE";
  createdById: string;
  createdAt: string; // ISO8601
  updatedAt: string;
  updatedById: string | null;
};
```
