# Implementation Plan: メンバー別の使用額の可視化（Member Spending）

**Branch**: `003-member-spending` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-member-spending/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

002のカレンダー画面の左側に、表示中の月のメンバーごとの支払額（支払者で集計）と割合を、名前・金額を
省略せずに表示する。データ構造は変えず、カレンダーが3秒ごとに取得している月別API
（`GET .../months/{yearMonth}`）に `memberTotals` を加えて、カレンダーと同じ取得で更新する。スマホの幅では
左の列88px・日付マスの金額10pxとし、試作で390px・360pxの両方で日付マスの金額がはみ出さないことを
確認済み（[research.md](./research.md) #1）。

## Technical Context

**Language/Version**: TypeScript, Node.js 22+（変更なし）

**Primary Dependencies**: Next.js 16.3.5, Prisma 6.19.3, SWR, Tailwind CSS（変更なし。新規追加なし）

**Storage**: SQLite。スキーマ変更なし・マイグレーションなし

**Testing**: Vitest（割合の計算・支払者別の集計）、Playwright（表示・自動反映・狭い画面での配置）

**Target Platform**: Webブラウザ（PWA、スマホ幅を主とする）

**Project Type**: web-service（Next.jsフルスタック単一プロジェクト）

**Performance Goals**: カレンダー画面を開いて3秒以内に、誰がいちばん多く払ったか読める（SC-001）。
追加の取得は発生しない

**Constraints**: 横幅360px以上の画面で、左の列とカレンダーの日付マスの金額が両方とも省略・はみ出しなく
読めること（SC-003）。360px未満は対象外

**Scale/Scope**: グループ2人を主眼とするが、人数の上限はない（左の列は縦に並べて全員を表示）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 根拠 |
|---|---|---|
| I. シンプルさとYAGNI | PASS | データ構造の変更なし、新規API・新規依存なし。既存の月別APIに項目を1つ足し、グラフは CSS の棒で描く。端末幅ごとの細かい文字サイズの切り替えはせず、640px を境に2段階だけにする（research.md #1） |
| II. テストファースト | PASS | 割合・並び順を純粋関数に分けてユニットテストで先に固める。狭い画面での「はみ出さない」も、E2Eで日付マスの幅と金額の幅を測って検証する（試作で使った計測方法をテストにする） |
| III. 仕様駆動のトレーサビリティ | PASS | spec の FR-001〜FR-010 に対応。数値の配置（88px等）は spec にない細部だが、FR-005・SC-003 を満たすための判断として research.md #1 に計測結果とともに記録した |
| IV. 反復的でレビュー可能なデリバリー | PASS | US1（集計と表示）→ US2（狭い画面での配置の検証）の順で、各段階で動く状態を保つ |
| V. 可観測性とデバッグ容易性 | PASS | 状態を変える操作は増えない（表示のみ）。集計の元になる支出の変更は002の構造化ログで追える |

**「1画面1機能」（002のFR-004、ユーザーの方針）との関係**: カレンダー画面の役割を「表示中の月の支出状況を
見る」と捉え直し、日付ごと・メンバーごとの表示を同じ役割とする（spec「背景と前提」、ユーザー確認済み）。
入力・変更の操作はカレンダー画面に加えない。

## Project Structure

### Documentation (this feature)

```text
specs/003-member-spending/
├── plan.md              # This file
├── research.md          # Phase 0: 配置の計測結果、集計・割合・色の判断
├── data-model.md        # Phase 1: 導出値の定義（保存データの変更なし）
├── quickstart.md        # Phase 1: 検証シナリオ
├── contracts/
│   ├── api.md           # 月別APIへの memberTotals の追加
│   └── screens.md       # カレンダー画面の配置
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2（/speckit-tasks で作成）
```

### Source Code (repository root)

```text
lib/
├── member-spending.ts           # 新規: computeMemberShares（純粋関数）と getMemberTotals（DB集計）
└── budget.ts                    # 変更: getMonthSummary のレスポンスに memberTotals を含める

components/
├── member-spending.tsx          # 新規: 左の列（名前・金額・割合の棒・%）
└── month-calendar.tsx           # 変更: カレンダーの左に member-spending を置く。狭い画面での余白・金額の文字を調整

tests/
├── unit/
│   ├── member-shares.test.ts    # 新規: 割合の丸め・0円・支出なし・並び順・色
│   └── budget-calculation.test.ts  # 変更: memberTotals（支払者で数える、月・グループで絞る、合計がspentと一致）
└── e2e/
    └── member-spending.spec.ts  # 新規: quickstart 1〜5（390px・360pxでの配置の計測を含む）
```

**Structure Decision**: 002と同じ構成。新しい画面・API・データは作らず、カレンダー画面と月別APIを拡張する。

## 実装の順序（tasks.md への申し送り）

1. **US1**: `lib/member-spending.ts` の純粋関数とDB集計（テスト先行）→ 月別APIに `memberTotals` を追加 →
   `components/member-spending.tsx` を作り、カレンダーの左に置く
2. **US2**: 狭い画面の配置（左の列の幅、余白、日付マスの金額の文字）を research.md #1 のとおりにし、
   390px・360pxでの計測をE2Eにする
3. **仕上げ**: quickstart の確認、README の機能説明の更新

## Constitution Check（Phase 1設計後の再評価）

data-model.md / contracts / quickstart.md の作成後も逸脱はない。保存データの変更がないため、002のような
データ移行も不要。Complexity Tracking は空欄のままでよい。

## Complexity Tracking

> Constitution Checkに違反なし。本セクションは該当なし。
