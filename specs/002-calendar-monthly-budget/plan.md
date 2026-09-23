# Implementation Plan: カレンダー表示と月別予算（Calendar & Monthly Budget）

**Branch**: `002-calendar-monthly-budget` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-calendar-monthly-budget/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

001の全部入り1画面ダッシュボードを「1画面1機能」の8画面に分割し、カレンダー画面を中心に据える。
予算はグループに1つの値から「グループ×年月」の設定額に変え、前月の残額（マイナスを含む）を翌月に
繰り越す。ユーザーは複数のグループに所属でき、選択中のグループをDBに記憶する。

技術的には、001の技術スタックを変えず、新規の依存パッケージも追加しない。
- 1画面を1つの `page.tsx` に対応させる。年月・日付はURLに持たせる
- 支出日・年月は日本時間基準の日付文字列として保存する
- 繰越額・残額は保存せず、純粋関数で毎回計算する
- 001の既存データは、Prismaマイグレーション1本の中で移行する
（詳細は [research.md](./research.md)）

## Technical Context

**Language/Version**: TypeScript, Node.js 22+（001から変更なし）

**Primary Dependencies**: Next.js 16.3.5 (App Router), Prisma 6.19.3, Auth.js v5, SWR, Zod, Tailwind CSS,
lucide-react（001から変更なし。新規追加なし）

**Storage**: SQLite（`prisma/dev.db`）。`MonthlyBudget` の追加、`ExpenseRecord.spentOn` /
`User.selectedGroupId` の追加、`Group.monthlyBudget` の削除（[data-model.md](./data-model.md)）

**Testing**: Vitest（繰越計算・日付処理・入力チェック・API）、Playwright（画面遷移とシナリオ）

**Target Platform**: Webブラウザ（PWA、スマホ幅を主とする）

**Project Type**: web-service（Next.jsフルスタック単一プロジェクト）

**Performance Goals**: カレンダー画面を開いて3秒以内に残額と日別合計が読める（SC-003）。
他メンバーの変更は3秒間隔のポーリングで数秒以内に反映（SC-005）

**Constraints**: 日付・月の判定は日本時間基準（本番サーバーのタイムゾーン設定に依存しない）。
既存データを失わずに移行する

**Scale/Scope**: 1グループ2人・月数十件の支出を主眼とする。繰越計算は予算開始月から表示月まで
毎回行うが、数年分でも数十か月の足し算で済む

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 根拠 |
|---|---|---|
| I. シンプルさとYAGNI | PASS | 新規依存なし（日付は `Intl`、カレンダーは自作グリッド）。繰越額は保存せず計算で求め、締め処理を持たない（research.md #5）。Proxy・Parallel Routes・UIライブラリは使わない。画面で使わなくなるAPI（`GET /expenses`、`PUT /budget`）は残さず削除する |
| II. テストファースト | PASS | 繰越計算を純粋関数に分け、DBなしのユニットテストで先に全ケースを書ける。画面遷移はcontracts/screens.mdの表をE2Eテストに落とす。001のE2Eテスト4本は画面構成の変更で動かなくなるため、新画面向けに書き換える（tasks.mdで先に失敗させる） |
| III. 仕様駆動のトレーサビリティ | PASS | data-model・contracts の各変更に対応するFR番号を記載。仕様にない要件は持ち込んでいない。支出編集後の遷移先、金額の万単位表記など仕様で細部が決まっていない点は、contracts/screens.md と research.md #7 に判断として明記した |
| IV. 反復的でレビュー可能なデリバリー | PASS | 下記「実装の順序」のとおり、データ移行 → US2 → US1 → US3 → US4 の順に、各段階で動く状態を保つ |
| V. 可観測性とデバッグ容易性 | PASS | 予算の設定（`budget.set`）とグループ切り替え（`group.select`）を構造化ログに追加する。支出の既存ログに `spentOn` を加える。`MonthlyBudget.updatedById` で誰が予算を変えたかをデータにも残す |

## Project Structure

### Documentation (this feature)

```text
specs/002-calendar-monthly-budget/
├── plan.md              # This file
├── research.md          # Phase 0: 技術判断
├── data-model.md        # Phase 1: 001からのデータ差分と移行
├── quickstart.md        # Phase 1: 検証シナリオ
├── contracts/
│   ├── api.md           # APIの差分
│   └── screens.md       # 画面ごとの役割・内容・遷移
├── checklists/
│   └── requirements.md  # /speckit-specify の品質チェック
└── tasks.md             # Phase 2（/speckit-tasks で作成）
```

### Source Code (repository root)

```text
app/
├── (auth)/                          # 変更なし
├── (dashboard)/
│   ├── layout.tsx                   # 変更: ログアウトのヘッダーを削除（メニューへ移設）。認証ガードは維持
│   ├── page.tsx                     # 変更: 振り分けのみ（redirect）
│   ├── groups/
│   │   ├── page.tsx                 # 新規: グループ切り替え
│   │   └── new/page.tsx             # 新規: グループ作成
│   ├── months/[yearMonth]/
│   │   ├── page.tsx                 # 新規: カレンダー
│   │   └── budget/page.tsx          # 新規: 予算決定・変更
│   ├── days/[date]/page.tsx         # 新規: 日別詳細
│   ├── expenses/
│   │   ├── new/page.tsx             # 新規: 支出追加
│   │   └── [expenseId]/edit/page.tsx # 新規: 支出編集
│   ├── invite-link/page.tsx         # 新規: 招待リンク発行
│   └── invite/[token]/page.tsx      # 変更なし（参加処理側で選択中グループを更新）
└── api/
    ├── groups/route.ts              # 変更: monthlyBudget削除、選択中グループを更新
    ├── groups/[groupId]/
    │   ├── months/[yearMonth]/route.ts         # 新規: GET カレンダー用
    │   ├── months/[yearMonth]/budget/route.ts  # 新規: PUT 設定額
    │   ├── days/[date]/route.ts                # 新規: GET 日別
    │   ├── expenses/route.ts                   # 変更: GET削除、POSTにspentOn
    │   ├── expenses/[expenseId]/route.ts       # 変更: PATCHにspentOn
    │   ├── budget/route.ts                     # 削除
    │   └── invite/route.ts                     # 変更なし
    ├── me/selected-group/route.ts   # 新規: PUT グループ切り替え
    └── invite/[token]/route.ts      # 変更なし（lib/invites.ts 側で対応）

components/
├── dashboard.tsx                    # 削除（各画面の部品に分割）
├── create-group-form.tsx            # 変更: 作成後の遷移先
├── month-calendar.tsx               # 新規: カレンダーのグリッドと上部表示
├── header-menu.tsx                  # 新規: 3点リーダーメニュー
├── budget-form.tsx                  # 新規
├── expense-form.tsx                 # 新規: 追加・編集で共用
├── day-expense-list.tsx             # 新規
├── group-switcher.tsx               # 新規
├── invite-link.tsx                  # 新規: dashboard.tsx の InviteSection を移設
└── ui/                              # 既存の共通部品を使う

lib/
├── budget.ts                        # 書き換え: computeMonthSummary（純粋関数）＋DB読み込み
├── date.ts                          # 新規: 日本時間の今日・今月、YYYY-MM/YYYY-MM-DDの検証、前後の月、月の日数
├── active-group.ts                  # 新規: requireActiveGroup / requireBudgetedGroup（research.md #3）
├── calendar.ts                      # 新規: 日曜始まりの月グリッド
├── expenses.ts                      # 新規: 日別の支出一覧
├── format.ts                        # 新規: 金額表示（万単位表記）
├── groups.ts / invites.ts           # 変更: 選択中グループの更新
└── validation/expense.ts            # 変更: spentOn追加、予算の入力スキーマをamountに

prisma/
├── schema.prisma                    # 変更（data-model.md）
└── migrations/<timestamp>_monthly_budget_calendar/migration.sql  # データ移行SQLを含む

tests/
├── unit/
│   ├── budget-carryover.test.ts     # 新規: computeMonthSummaryの全ケース
│   ├── date.test.ts                 # 新規: 日付処理
│   ├── calendar-grid.test.ts        # 新規: 月グリッド
│   ├── format.test.ts               # 新規: 万単位表記
│   ├── selected-group.test.ts       # 新規: 選択中グループの解決・切り替え
│   ├── day-expenses.test.ts         # 新規: 日別の支出一覧
│   ├── budget-calculation.test.ts   # 書き換え: DBからの集計（spentOn基準）
│   ├── expense-validation.test.ts   # 変更: spentOn
│   └── group-authorization.test.ts  # 変更なし
└── e2e/
    ├── helpers.ts                   # 新規: signup / login / グループ作成の共通手順
    ├── first-run.spec.ts            # 新規: quickstart 1
    ├── calendar.spec.ts             # 新規: quickstart 2
    ├── day-detail.spec.ts           # 新規: quickstart 3（payment-method.spec.ts を統合）
    ├── budget-carryover.spec.ts     # 新規: quickstart 4（budget-display.spec.ts を置き換え）
    ├── expense-sharing.spec.ts      # 書き換え: quickstart 5
    ├── multi-group.spec.ts          # 新規: quickstart 6
    ├── menu.spec.ts                 # 新規: メニュー・招待リンク・ログアウト
    └── logout.spec.ts               # 削除（menu.spec.ts へ移行）
```

**Structure Decision**: 001と同じNext.jsフルスタック単一プロジェクト。ログイン必須の画面はすべて
`app/(dashboard)/` に置き、1画面＝1 `page.tsx` とする。画面の部品は `components/` に置き、1画面の
部品を1ファイルにまとめていた `components/dashboard.tsx` は削除する。

## 実装の順序（tasks.md への申し送り）

各段階の終わりで、テストが通り、アプリが使える状態を保つ（憲法IV）。

001の旧画面（`dashboard.tsx`）は、新画面がその機能（支出追加・予算設定・招待・ログアウト）をすべて
引き継ぐまで残し、最後に削除する。新画面はURLで直接開ける形で先に作る（詳細は tasks.md の
「進め方の方針」）。

1. **データ移行**: スキーマ変更と移行SQL、`lib/date.ts`、`lib/budget.ts`、`lib/active-group.ts`。
   旧画面と旧API（`GET /expenses`、`PUT /budget`）は新しいデータ構造の上で動かし続ける
2. **US1（カレンダー）**: 月別APIとカレンダー画面
3. **US2（予算）**: 予算APIと予算画面、`/` の振り分けに初回の予算決定を追加
4. **US3（日別・支出）**: 日別API、日別詳細・支出追加・支出編集の各画面
5. **US4（メニュー・複数グループ）**: メニュー、招待リンク画面、グループ作成・切り替え
6. **切り替えと仕上げ**: `/` の行き先をカレンダーにし、旧画面・旧API・旧E2Eを削除。quickstart の
   全シナリオ確認、README・deployment.md の更新

## Constitution Check（Phase 1設計後の再評価）

data-model.md / contracts / quickstart.md の作成後も、新たな逸脱はない。

- `User.selectedGroupId` の追加は FR-028 から直接導かれるもので、先回りの設計ではない
- 繰越額を保存しない判断により、データモデルの追加は `MonthlyBudget` 1つに収まった
- 001のE2Eテストの書き換えは、画面構成の変更（仕様の変更）に伴うもので、テストを弱めるものではない。
  001で検証していた観点（共有・自動反映・支払い方法・ログアウト・金額の拒否）は、新しいテストに
  すべて引き継ぐ
- Complexity Tracking は空欄のままでよい

## Complexity Tracking

> Constitution Checkに違反なし。本セクションは該当なし。
