# Implementation Plan: 支出のタイトルとメモ（Expense Title & Memo）

**Branch**: `004-expense-title-memo` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-expense-title-memo/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

支出の「内容」（1行・必須・200文字）を、タイトル（1行・必須・50文字）とメモ（複数行・任意・200文字）に分ける。
データは `description` を `title` に名前を変え、`memo`（既定値 `""`）を加えるマイグレーション1本で移行する
（51文字以上の既存の内容は、先頭50文字をタイトル、全文をメモへ）。文字数は `Intl.Segmenter` で見た目の
1文字として数え、入力欄の文字数表示とサーバーの入力チェックで同じ関数を使う。日別詳細では、タイトルの下に
メモの全文を改行を保って表示する（[research.md](./research.md)）。

## Technical Context

**Language/Version**: TypeScript, Node.js 22+（変更なし）

**Primary Dependencies**: Next.js 16.3.5, Prisma 6.19.3, Zod, SWR, Tailwind CSS（変更なし。新規追加なし）

**Storage**: SQLite。`ExpenseRecord.description` → `title`、`memo` を追加（データ移行を含むマイグレーション1本）

**Testing**: Vitest（文字数・入力チェック）、Playwright（入力・表示・自動反映）、移行はDBのコピーで確認

**Target Platform**: Webブラウザ（PWA、スマホ幅を主とする）

**Project Type**: web-service（Next.jsフルスタック単一プロジェクト）

**Performance Goals**: 変更なし（取得の回数・量は実質的に変わらない）

**Constraints**: 既存データを失わずに移行する。文字数は見た目の1文字で数える（UTF-16の単位で数えない）

**Scale/Scope**: 画面2つ（支出追加・編集の共通フォーム、日別詳細）とAPI・データの変更

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 根拠 |
|---|---|---|
| I. シンプルさとYAGNI | PASS | 新規依存なし（`Intl.Segmenter` は標準）。`description` の名前変更と `memo` の追加だけで、同じ意味の列を二重に持たない。メモは `""` で「なし」を表し、`null` との2通りを作らない |
| II. テストファースト | PASS | 文字数の関数と入力チェックをユニットテストで先に固める。入力・表示・拒否・自動反映はE2Eで検証する。既存テストの `description` は `title` に書き換える（観点は維持） |
| III. 仕様駆動のトレーサビリティ | PASS | spec の FR-001〜FR-008 に対応。文字数の数え方・`maxLength` を使わない判断は research.md #2, #3 に記録した |
| IV. 反復的でレビュー可能なデリバリー | PASS | 移行（データとAPI）→ US1（入力）→ US2（表示）の順で、各段階でテストが通る状態を保つ |
| V. 可観測性とデバッグ容易性 | PASS | 支出の作成・更新の構造化ログ（002）はそのまま。タイトル・メモ本文はログに出さない（金額・支出日と同じ扱い） |

## Project Structure

### Documentation (this feature)

```text
specs/004-expense-title-memo/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   └── screens.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks で作成
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                         # 変更: description → title、memo 追加
└── migrations/<timestamp>_expense_title_memo/migration.sql  # 移行SQLを含む

lib/
├── text.ts                               # 新規: countChars（見た目の文字数）
└── validation/expense.ts                 # 変更: title / memo のスキーマ

app/api/groups/[groupId]/expenses/
├── route.ts                              # 変更: POST で title / memo を保存
└── [expenseId]/route.ts                  # 変更なし（スキーマ経由で title / memo を更新）

app/(dashboard)/expenses/
├── new/page.tsx                          # 変更: 初期値を title / memo に
└── [expenseId]/edit/page.tsx             # 変更: 初期値を title / memo に

components/
├── expense-form.tsx                      # 変更: タイトル欄・メモ欄・文字数表示
└── day-expense-list.tsx                  # 変更: タイトルの下にメモ全文

tests/
├── unit/
│   ├── text.test.ts                      # 新規: countChars
│   ├── expense-validation.test.ts        # 変更: title / memo
│   ├── budget-calculation.test.ts        # 変更: description → title
│   └── day-expenses.test.ts              # 変更: description → title
└── e2e/
    ├── helpers.ts                        # 変更: addExpenseViaApi の description → title
    ├── expense-memo.spec.ts              # 新規: quickstart 1〜4
    ├── day-detail.spec.ts                # 変更: 入力欄のテストIDを title に
    ├── authorization.spec.ts             # 変更: description → title
    └── member-spending.spec.ts           # 変更: description → title
```

**Structure Decision**: 002・003と同じ構成。新しい画面・APIは作らず、支出のデータ・入力チェック・
入力フォーム・日別詳細を変更する。

## 実装の順序（tasks.md への申し送り）

1. **基盤（データの移行）**: スキーマ変更と移行SQL、`lib/text.ts`、入力チェック、API、既存テストの
   `description` → `title` の書き換え。この段階で既存の画面は「内容」欄のまま `title` として送る形で動かす
2. **US1（入力）**: 支出追加・編集フォームにタイトル欄・メモ欄・文字数表示
3. **US2（表示）**: 日別詳細でタイトルの下にメモ全文
4. **仕上げ**: 移行をDBのコピーで確認、quickstart の確認、README・deployment の更新（移行前のバックアップ）

## Constitution Check（Phase 1設計後の再評価）

data-model.md / contracts / quickstart.md の作成後も逸脱はない。データ移行は002と同じ方式（マイグレーション
1本、DBのコピーで確認）。Complexity Tracking は空欄のままでよい。

## Complexity Tracking

> Constitution Checkに違反なし。本セクションは該当なし。
