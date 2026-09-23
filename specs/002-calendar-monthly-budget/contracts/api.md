# API Contract: カレンダー表示と月別予算

`specs/001-shared-budget/contracts/api.md` からの差分。記載のないエンドポイントは001から変更しない。
共通ルールも001と同じ（未認証は401、グループのメンバーでなければ403。FR-007）。

## 変更の一覧

| エンドポイント | 変更 |
|---|---|
| `GET /api/groups/{groupId}/months/{yearMonth}` | 新規（カレンダー用） |
| `PUT /api/groups/{groupId}/months/{yearMonth}/budget` | 新規（`PUT /api/groups/{groupId}/budget` を置き換え） |
| `GET /api/groups/{groupId}/days/{date}` | 新規（日別詳細用） |
| `PUT /api/me/selected-group` | 新規（グループ切り替え） |
| `POST /api/groups/{groupId}/expenses` | `spentOn` を必須項目に追加 |
| `PATCH /api/groups/{groupId}/expenses/{expenseId}` | `spentOn` を任意項目に追加 |
| `POST /api/groups` | `monthlyBudget` を削除。作成したグループを選択中にする |
| `POST /api/invite/{token}` | 参加したグループを選択中にする |
| `PUT /api/groups/{groupId}/budget` | **削除**（月別予算に置き換え） |
| `GET /api/groups/{groupId}/expenses` | **削除**（画面で使わなくなるため。月・日単位の取得に置き換え） |

## 月別

### `GET /api/groups/{groupId}/months/{yearMonth}`

カレンダー画面の表示に必要な値をまとめて返す（FR-013, FR-014）。SWRのポーリング対象。

- `yearMonth`: `YYYY-MM`。形式不正は400
- **Response 200**:

```ts
{
  yearMonth: string;              // "2026-09"
  budget: {
    setAmount: number;            // その月の設定額（引き継ぎ後。FR-008）
    carryover: number;            // 前月からの繰越額（マイナスあり）
    total: number;                // setAmount + carryover
  } | null;                       // 予算開始月より前の月は null
  spent: number;                  // その月の支出合計
  remaining: number | null;       // total - spent。budget が null なら null
  dailyTotals: Record<string, number>; // { "2026-09-05": 1500 }。支出のない日はキーなし
}
```

### `PUT /api/groups/{groupId}/months/{yearMonth}/budget`

その月の設定額を登録・変更する（FR-005〜FR-007, FR-009）。初回の予算決定にも使う。

- **Request**: `{ amount: number }`（1以上の整数）
- **Response 200**: `{ yearMonth: string, amount: number }`
- **Response 400**: `amount <= 0`、整数でない、`yearMonth` の形式不正
- **ログ**: `budget.set`（groupId, yearMonth, amount, userId）

## 日別

### `GET /api/groups/{groupId}/days/{date}`

日別詳細画面の一覧（FR-019）。SWRのポーリング対象。

- `date`: `YYYY-MM-DD`（実在する日付）。形式不正は400
- **Response 200**: `{ date: string, total: number, expenses: ExpenseRecord[] }`（`createdAt` の昇順）

## 支出記録

### `POST /api/groups/{groupId}/expenses`

- **Request**: `{ amount, description, paidById, paymentMethod, spentOn: string }`
  （`spentOn` は `YYYY-MM-DD`、必須。FR-017）
- **Response 201**: `ExpenseRecord`
- **Response 400**: 001の条件に加え、`spentOn` の欠落・形式不正
- `paidById` がそのグループのメンバーでない場合も400とする

### `PATCH /api/groups/{groupId}/expenses/{expenseId}`

- **Request**: `{ amount?, description?, paidById?, paymentMethod?, spentOn? }`（FR-020）
- 404の扱いは001と同じ（削除済みの記録の編集）

## グループ

### `POST /api/groups`

- **Request**: `{ name: string }`
- **Response 201**: `{ groupId: string }`
- 作成者を `GroupMember` に追加し、`User.selectedGroupId` を作成したグループにする（FR-026）

### `PUT /api/me/selected-group`

選択中のグループを切り替える（FR-027, FR-028）。

- **Request**: `{ groupId: string }`
- **Response 200**: `{ groupId: string }`
- **Response 403**: そのグループのメンバーでない場合
- **ログ**: `group.select`（userId, groupId）

### `POST /api/invite/{token}`

- 001の動作に加え、参加したグループを `User.selectedGroupId` にする（FR-026）
- すでにそのグループのメンバーである場合も200を返し、選択中にする

## 型定義（参考）

```ts
type ExpenseRecord = {
  id: string;
  amount: number;
  description: string;
  paidById: string;
  paymentMethod: "CASH" | "MOBILE";
  spentOn: string;      // 追加: "YYYY-MM-DD"
  createdById: string;
  createdAt: string;
  updatedAt: string;
  updatedById: string | null;
};
```
