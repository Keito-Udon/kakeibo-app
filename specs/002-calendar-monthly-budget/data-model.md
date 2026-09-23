# Data Model: カレンダー表示と月別予算

`specs/001-shared-budget/data-model.md` からの差分を示す。記載のないモデル・フィールドは001から
変更しない。

## 変更の一覧

| モデル | 変更 | 対応する要件 |
|---|---|---|
| `MonthlyBudget` | 新規 | FR-005〜FR-012 |
| `ExpenseRecord` | `spentOn` を追加 | FR-017 |
| `User` | `selectedGroupId` を追加 | FR-026〜FR-029 |
| `Group` | `monthlyBudget` を削除（`MonthlyBudget` へ移行） | FR-005 |
| `GroupMember` | 変更なし（1ユーザーが複数行を持てることは001のスキーマで既に可能） | FR-026 |

## MonthlyBudget（新規）

あるグループの、ある年月の設定額。

| フィールド | 型 | 説明 |
|---|---|---|
| id | string (cuid) | 主キー |
| groupId | string | Groupへの外部キー |
| yearMonth | string | 対象の年月（`YYYY-MM`、日本時間基準。research.md #4） |
| amount | integer | 設定額（円）。1以上（FR-007） |
| createdAt | datetime | 作成日時 |
| updatedAt | datetime | 更新日時 |
| updatedById | string | 最後に設定・変更したUserへの外部キー（憲法V） |

**制約**: `(groupId, yearMonth)` は一意。同じ月の設定は上書き（upsert）する。同時に変更された場合は
後から保存された値が残る（Edge Cases）。

**バリデーション**: `yearMonth` は `^\d{4}-(0[1-9]|1[0-2])$`、`amount` は1以上の整数。

## ExpenseRecord（変更）

| フィールド | 型 | 説明 |
|---|---|---|
| spentOn | string | **追加**。支出日（`YYYY-MM-DD`、日本時間基準）。日別・月別集計の基準（FR-017） |

**インデックス**: `(groupId, spentOn)`。カレンダーの日別集計・日別詳細・月の合計がすべてこの条件で
検索するため。

**バリデーション**: `spentOn` は実在する日付の `YYYY-MM-DD`（例: `2026-02-30` は拒否）。過去・未来の
日付はどちらも許可する（Edge Cases）。追加時は必須、編集時は任意。

**備考**: `createdAt` は「記録された日時」として残す。集計には使わない。

## User（変更）

| フィールド | 型 | 説明 |
|---|---|---|
| selectedGroupId | string, nullable | **追加**。選択中のグループ（FR-028）。未所属ならnull |

**整合性**: `selectedGroupId` は、そのユーザーが所属するグループでなければならない。サーバー側で
選択中グループを解決するとき、null または所属していないグループを指していた場合は、最初に参加した
グループ（`joinedAt` が最も古い `GroupMember`）を選び直して保存する。

**更新されるタイミング**:
- グループを作成したとき → 作成したグループ（FR-026）
- 招待リンクで参加したとき → 参加したグループ（FR-026）
- グループ切り替え画面で選んだとき → 選んだグループ（FR-027）

## Group（変更）

| フィールド | 変更 |
|---|---|
| monthlyBudget | **削除**。値は `MonthlyBudget` に移行する（下記） |

「グループで一度でも予算が設定されたか」（FR-001, FR-003）は、そのグループの `MonthlyBudget` が
1行以上あるかで判定する。専用のフラグは持たない。

## 導出値（保存しない）

research.md #5 の方式で、表示のたびに計算する。

| 値 | 計算方法 |
|---|---|
| 予算開始月 | そのグループの `MonthlyBudget.yearMonth` の最小値 |
| ある月の設定額 | その月の `MonthlyBudget.amount`。なければ直前の月の設定額（FR-008） |
| ある月の支出合計 | `spentOn` がその月に含まれる `ExpenseRecord.amount` の合計 |
| ある日の支出合計 | `spentOn` がその日の `ExpenseRecord.amount` の合計（FR-014） |
| ある月の繰越額 | 前月の残額。予算開始月は0（FR-010, FR-011） |
| ある月の予算 | 設定額 ＋ 繰越額 |
| ある月の残額 | 予算 − 支出合計。予算開始月より前の月は「予算なし」（null） |

## 既存データの移行（research.md #6）

1本のマイグレーションの中で、次の順に行う。

1. `MonthlyBudget` テーブルを作成する
2. `Group.monthlyBudget` がnullでないグループごとに、マイグレーション実行時点の日本時間の年月で
   `MonthlyBudget` を1行作成する（`updatedById` はそのグループで最初に参加したメンバー）
3. `ExpenseRecord.spentOn` を追加し、既存行は `createdAt` を日本時間に変換した日付で埋める
4. `User.selectedGroupId` を追加し、最初に参加したグループで埋める
5. `Group.monthlyBudget` を削除する

移行後の確認: 移行前の支出件数・金額合計と、移行後の `spentOn` 付き支出の件数・金額合計が一致
すること。予算が設定されていたグループ数と `MonthlyBudget` の行数が一致すること。
