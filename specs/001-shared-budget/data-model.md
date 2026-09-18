# Data Model: 共有家計簿（Shared Budget）

spec.md の Key Entities（User / Group / ExpenseRecord）と Functional Requirements を、Prismaで
実装するためのデータモデルに落とし込んだもの。

## User

アカウント保持者。

| フィールド | 型 | 説明 |
|---|---|---|
| id | string (cuid) | 主キー |
| email | string, unique | ログインID。FR-001 |
| passwordHash | string | bcryptでハッシュ化したパスワード。平文は保存しない |
| displayName | string | グループ画面での表示名 |
| createdAt | datetime | 作成日時 |

**バリデーション**: emailは一意・形式チェック必須（FR-001）。

## Group

支出を共有する単位（世帯）。

| フィールド | 型 | 説明 |
|---|---|---|
| id | string (cuid) | 主キー |
| name | string | グループ名（例: 「〇〇家」） |
| monthlyBudget | integer, nullable | 月次予算額（円）。未設定の場合はnull（FR-008、Edge Cases） |
| createdAt | datetime | 作成日時 |

**関連**: `GroupMember` を介して複数の `User` と多対多（下限2人を想定するが、DB上の上限は設けない。
Assumptions参照）。

## GroupMember（中間テーブル）

UserとGroupの所属関係。

| フィールド | 型 | 説明 |
|---|---|---|
| id | string (cuid) | 主キー |
| userId | string | Userへの外部キー |
| groupId | string | Groupへの外部キー |
| joinedAt | datetime | 参加日時 |

**制約**: `(userId, groupId)` の組み合わせは一意。

## InviteToken

グループへの招待リンク（FR-014）。

| フィールド | 型 | 説明 |
|---|---|---|
| id | string (cuid) | 主キー |
| token | string, unique | URLに埋め込む推測困難なトークン（`crypto.randomUUID()`等） |
| groupId | string | 対象Groupへの外部キー |
| createdBy | string | 発行したUserのid |
| createdAt | datetime | 発行日時 |
| revokedAt | datetime, nullable | 失効日時。nullなら有効（research.md #3の再発行/失効対策） |

**バリデーション**: `revokedAt` が設定済み、または対応するトークンが存在しない場合、`/invite/[token]`
アクセス時にエラーとする（Edge Cases）。

## ExpenseRecord

支出記録。

| フィールド | 型 | 説明 |
|---|---|---|
| id | string (cuid) | 主キー |
| groupId | string | 所属Groupへの外部キー |
| amount | integer | 金額（円）。0以下は拒否（FR-010） |
| description | string | 内容メモ（何に使ったか） |
| paidById | string | 支払者（Userへの外部キー） |
| paymentMethod | enum(`CASH`, `MOBILE`) | 支払い方法（FR-011） |
| createdById | string | この記録を最初に作成したUserのid（監査用。編集・削除自体は誰でも可、FR-012） |
| createdAt | datetime | 記録日時 |
| updatedAt | datetime | 最終更新日時 |
| updatedById | string, nullable | 最後に編集/削除操作を行ったUserのid（可観測性のため。憲法Vに対応） |

**バリデーション**: `amount > 0`（FR-010, Edge Cases）。

**状態遷移**: なし（作成・編集・削除のみ。ステータスフィールドは持たない）。

## 導出値（DBには保存しない）

- **当月支出合計**: `Group` に紐づく `ExpenseRecord` のうち、`createdAt` が当月（暦月）のものの
  `amount` 合計（FR-009）
- **残額**: `monthlyBudget - 当月支出合計`。`monthlyBudget` が未設定の場合は「未設定」として扱う
  （Edge Cases）

## エンティティ関係図（概略）

```text
User ──< GroupMember >── Group ──< InviteToken
  │                         │
  └──< ExpenseRecord (paidBy / createdBy / updatedBy) >──┘
```
