# Implementation Plan: 共有家計簿（Shared Budget）

**Branch**: `001-shared-budget` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-shared-budget/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

半同棲・新婚カップル(2人)が、共有財布の支出を記録・共有できるWebアプリ。メールアドレス＋パスワードで
アカウントを作成し、招待リンク経由でグループ（世帯）に参加する。グループメンバーは支出記録（金額・
内容・支払者・支払い方法）を追加・編集・削除でき、変更は他メンバーの画面に数秒以内に自動反映される。
トップ画面では月次予算に対する残額を確認できる。技術的には、Next.jsフルスタック構成上でSWRの
ショートポーリングによる疑似リアルタイム同期を実現し、WebSocket等の追加インフラを避けてシンプルさを
保つ（詳細は research.md 参照）。

## Technical Context

**Language/Version**: TypeScript, Node.js 22+

**Primary Dependencies**: Next.js (App Router), Prisma, Auth.js（Credentials Provider）, SWR, Zod

**Storage**: SQLite（`prisma/dev.db`）, Prisma ORM

**Testing**: Vitest（ユニット/API Routeレベル）, Playwright（E2E）

**Target Platform**: Webブラウザ（PWA。iOS/Androidともホーム画面追加でカバーし、ネイティブビルドは行わない）

**Project Type**: web-service（Next.jsフルスタックの単一プロジェクト。フロントエンド/バックエンドの
プロセス分離はしない）

**Performance Goals**: 2〜数名規模のグループを想定。ポーリング間隔3〜5秒で「数秒以内の反映」
（FR-013, SC-002）を実現する

**Constraints**: SQLiteの単一ライター特性を許容できる規模の同時アクセス（数名規模のグループを
複数抱える程度）に留める

**Scale/Scope**: MVPは1グループ・2ユーザーの利用を主眼とするが、グループ人数の上限はデータモデル上
設けない

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 根拠 |
|---|---|---|
| I. シンプルさとYAGNI | PASS | Next.jsフルスタック単一プロセス、WebSocketではなくポーリングを採用し、立て替え精算・OCR等はスコープ外とした（research.md #1） |
| II. テストファースト | PASS | Vitest（API/ロジック）＋Playwright（E2E）を採用し、`/speckit-tasks`で各タスクに実装前テストを紐付ける方針（research.md #5） |
| III. 仕様駆動のトレーサビリティ | PASS | 本プランはspec.mdのFR-001〜FR-014に直接対応しており、仕様外の要件は持ち込んでいない |
| IV. 反復的でレビュー可能なデリバリー | PASS | spec.mdのUser Story P1/P2/P3の優先順位に沿って`/speckit-tasks`で小さいタスクに分解する予定（本コマンドでは分解しない） |
| V. 可観測性とデバッグ容易性 | PASS | API Routeでの支出記録の追加・編集・削除操作を、誰が・いつ・何を変更したかが分かる形でログ出力する方針（data-model.md参照） |

複雑さの逸脱なし。Complexity Trackingセクションは空欄とする。

## Project Structure

### Documentation (this feature)

```text
specs/001-shared-budget/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── (auth)/
│   ├── login/page.tsx           # ログイン画面
│   └── signup/page.tsx          # アカウント作成画面
├── (dashboard)/
│   ├── layout.tsx                # ログイン必須のグループダッシュボード共通レイアウト
│   ├── page.tsx                   # トップ画面（月次残額・支出一覧）
│   └── invite/[token]/page.tsx    # 招待リンク経由の参加画面
├── api/
│   ├── auth/[...nextauth]/route.ts   # Auth.jsハンドラ
│   ├── groups/route.ts               # グループ作成
│   ├── groups/[groupId]/budget/route.ts  # 月次予算の設定・取得
│   ├── groups/[groupId]/invite/route.ts  # 招待リンクの発行・再発行
│   ├── invite/[token]/route.ts       # 招待トークンでのグループ参加
│   └── expenses/route.ts             # 支出記録の追加・一覧取得
│   └── expenses/[expenseId]/route.ts # 支出記録の編集・削除
├── layout.tsx
└── globals.css

lib/
├── db.ts        # Prisma Clientのシングルトン
├── auth.ts      # Auth.js設定
└── validation/  # Zodスキーマ（支出金額・招待トークン等の入力検証）

prisma/
└── schema.prisma

tests/
├── unit/        # Vitest: バリデーション・残額計算ロジック等
└── e2e/         # Playwright: ログイン〜支出記録〜共有閲覧のシナリオ
```

**Structure Decision**: Next.js App Routerのルートグループ（`(auth)` / `(dashboard)`）で画面を分離し、
`app/api/` 以下にRESTライクなAPI Routesを配置する単一プロジェクト構成。フロントエンドとバックエンドの
プロセス分離は行わない（憲法・research.md #6で確定済み）。

## Constitution Check（Phase 1設計後の再評価）

data-model.md / contracts / quickstart.md を作成した結果、新たな逸脱は発生していない。

- `ExpenseRecord` に `createdById` / `updatedById` を持たせたことで、原則V（可観測性）を
  データモデルレベルでも担保できている
- 招待トークンの失効（`revokedAt`）機構を追加したが、これはFR-014・Edge Casesから直接導かれる
  要件であり、新たな複雑さの持ち込みではない
- 引き続きComplexity Trackingは空欄のままでよい

## Complexity Tracking

> Constitution Checkに違反なし。本セクションは該当なし。
