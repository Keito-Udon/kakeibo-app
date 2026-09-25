# Data Model: 支出のタイトルとメモ

`specs/002-calendar-monthly-budget/data-model.md` の `ExpenseRecord` からの差分。他のモデルは変更しない。

## ExpenseRecord（変更）

| フィールド | 型 | 説明 |
|---|---|---|
| ~~description~~ → **title** | string | 名前を変更。タイトル（何に使ったかを短く）。必須、前後の空白を除いて1〜50文字（見た目の文字数）。改行を含まない（FR-001, FR-002） |
| **memo** | string, 既定値 `""` | 追加。メモ（補足）。前後の空白を除いて0〜200文字（見た目の文字数、改行も1文字）。改行を含められる。`""` は「メモなし」（FR-003） |

**バリデーション**（サーバーの入力チェック。research.md #2, #3）:
- `title`: 前後の空白を除去 → 1文字以上・50文字以下（`countChars`）・改行を含まない
- `memo`: 前後の空白を除去 → 200文字以下（`countChars`）。追加時に省略したら `""`。編集時に省略したら変更しない

## 既存データの移行（FR-007, research.md #1）

1本のマイグレーションで次を行う。

1. `ExpenseRecord` に `title` と `memo` を持つ新しい表を作る
2. 既存の各行について:
   - `description` が50文字以下 → `title = description`、`memo = ""`
   - `description` が51文字以上 → `title = description の先頭50文字`、`memo = description`（全文）
3. `description` 列をなくす

移行後の確認（SC-002）: 支出の件数と金額の合計が移行前と一致すること。移行前の `description` が50文字以下の
行は `title` と一致し、51文字以上の行は `memo` と一致すること。
