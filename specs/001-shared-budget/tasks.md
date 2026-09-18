---
description: "Task list template for feature implementation"
---

# Tasks: 共有家計簿（Shared Budget）

**Input**: Design documents from `/specs/001-shared-budget/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: 憲法（`.specify/memory/constitution.md`）原則II「テストファースト（絶対厳守）」により、
本フィーチャーはテストタスクを必須で含む。各実装タスクの前に対応するテストタスクを実行し、
実装前に失敗する状態にすること。

**Organization**: タスクはspec.mdのユーザーストーリー（P1/P2/P3）ごとにグループ化している。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- **[Story]**: 対応するユーザーストーリー（US1, US2, US3）
- ファイルパスは全て `~/kakeibo-app` を repository root とした相対パス

## Path Conventions

Next.jsフルスタック単一プロジェクト（plan.md の Project Structure を参照）。
`app/`, `lib/`, `prisma/`, `tests/` を repository root に配置する。

---

## Phase 1: Setup

**Purpose**: プロジェクトの技術的な下準備

- [ ] T001 `npx prisma init --datasource-provider sqlite` を実行し、`prisma/schema.prisma` の雛形と `DATABASE_URL` を用意する
- [ ] T002 [P] 依存パッケージを追加する: `@prisma/client`, `prisma`, `next-auth`, `bcrypt`, `swr`, `zod`（`package.json`）
- [ ] T003 [P] テスト用パッケージを追加し設定する: `vitest`, `@vitejs/plugin-react` を導入し `vitest.config.ts` を作成する
- [ ] T004 [P] `@playwright/test` を導入し `playwright.config.ts` を作成する（`baseURL: http://localhost:3000`）
- [ ] T005 [P] `.env.example` に `DATABASE_URL="file:./prisma/dev.db"` と `AUTH_SECRET=` を記載する

**Checkpoint**: 依存関係とテストランナーが動く状態

---

## Phase 2: Foundational（すべてのユーザーストーリーに必須の基盤）

**⚠️ CRITICAL**: このフェーズが完了するまで、どのユーザーストーリーの実装にも着手できない

- [ ] T006 `prisma/schema.prisma` に data-model.md 通りのモデルを定義する: `User`（id, email unique, passwordHash, displayName, createdAt）, `Group`（id, name, monthlyBudget nullable, createdAt）, `GroupMember`（userId, groupId, joinedAt, `(userId, groupId)` unique）, `InviteToken`（id, token unique, groupId, createdBy, createdAt, revokedAt nullable）, `ExpenseRecord`（id, groupId, amount, description, paidById, paymentMethod enum(CASH, MOBILE), createdById, createdAt, updatedAt, updatedById nullable）
- [ ] T007 `npx prisma migrate dev --name init` で初回マイグレーションを適用する（T006に依存）
- [ ] T008 [P] `lib/db.ts` にPrisma Clientのシングルトンを実装する
- [ ] T009 [P] `lib/auth.ts` にAuth.jsのCredentials Providerを設定する（emailでUser検索し、bcryptでpasswordHashを検証してセッションを発行）
- [ ] T010 [P] `lib/validation/` にZodスキーマを作成する: signup入力（email形式, password最低長）、支出金額（`amount > 0`、FR-010）
- [ ] T011 [P] `lib/logger.ts` に構造化ログ出力ヘルパーを実装する（誰が・何を・いつ変更したかを出力できる形。憲法V対応）
- [ ] T012 `app/api/auth/signup/route.ts` に `POST /api/auth/signup` を実装する（contracts/api.md準拠: 201/400/409、パスワードはbcryptでハッシュ化して保存）（T009, T010, T011に依存）
- [ ] T013 `app/api/auth/[...nextauth]/route.ts` にAuth.jsのルートハンドラを実装する（T009に依存）
- [ ] T014 `app/layout.tsx` をAuth.jsのSessionProviderでラップする
- [ ] T015 `app/(dashboard)/layout.tsx` に認証ガード付きレイアウトを実装する（未ログイン時は `/login` にリダイレクト）（T013に依存）

**Checkpoint**: アカウント作成・ログイン・認証ガードが動作する状態。ここから各ユーザーストーリーに着手できる

---

## Phase 3: User Story 1 - 支出の記録とグループ共有閲覧 (Priority: P1) 🎯 MVP

**Goal**: グループメンバーが支出を記録・編集・削除でき、他のメンバーの画面に数秒以内に反映される（FR-004〜FR-007, FR-010, FR-012〜FR-014）

**Independent Test**: メンバーAが支出を記録し、メンバーBの画面（リロードなし）に数秒以内に反映されることを確認する（quickstart.md シナリオ1〜4）

### Tests for User Story 1（実装前に必ず作成し、失敗する状態にすること）

- [ ] T016 [P] [US1] `tests/e2e/expense-sharing.spec.ts` にPlaywright E2Eテストを作成する: サインアップ→ログイン→グループ作成→招待リンク発行→別ユーザーが参加→支出記録→もう一方の画面に反映、を検証（quickstart.md シナリオ1〜4に対応）
- [ ] T017 [P] [US1] `tests/unit/expense-validation.test.ts` にVitestユニットテストを作成する: 支出金額が `amount <= 0` の場合に拒否されること（FR-010）
- [ ] T018 [P] [US1] `tests/unit/group-authorization.test.ts` にVitestユニットテストを作成する: グループに属さないユーザーが支出記録にアクセスした場合に403になること（FR-007）

### Implementation for User Story 1

- [ ] T019 [US1] `app/api/groups/route.ts` に `POST /api/groups` を実装する（グループ作成、作成者を自動的に `GroupMember` に追加。contracts/api.md準拠）
- [ ] T020 [US1] `app/api/groups/[groupId]/invite/route.ts` に `POST /api/groups/{groupId}/invite` を実装する（既存の有効なトークンを失効させて新規発行。research.md #3準拠）
- [ ] T021 [US1] `app/api/invite/[token]/route.ts` に `POST /api/invite/{token}` を実装する（トークンが存在しない/失効済みなら404、成功時は `GroupMember` を作成。FR-004, FR-014）
- [ ] T022 [US1] `app/api/groups/[groupId]/expenses/route.ts` に `GET /api/groups/{groupId}/expenses` を実装する（メンバーのみアクセス可、非メンバーは403。FR-006, FR-007）
- [ ] T023 [US1] 同ファイル `app/api/groups/[groupId]/expenses/route.ts` に `POST /api/groups/{groupId}/expenses` を実装する（`amount <= 0` を拒否。FR-005, FR-010）（T017, T010に依存）
- [ ] T024 [US1] `app/api/groups/[groupId]/expenses/[expenseId]/route.ts` に `PATCH /api/groups/{groupId}/expenses/{expenseId}` を実装する（グループの誰でも編集可、対象が既に削除済みなら404。FR-012, Edge Cases）
- [ ] T025 [US1] 同ファイル `app/api/groups/[groupId]/expenses/[expenseId]/route.ts` に `DELETE /api/groups/{groupId}/expenses/{expenseId}` を実装する（グループの誰でも削除可、既に存在しなければ404。FR-012）
- [ ] T026 [US1] [P] `app/(auth)/signup/page.tsx` にサインアップ画面を実装する
- [ ] T027 [US1] [P] `app/(auth)/login/page.tsx` にログイン画面を実装する
- [ ] T028 [US1] `app/(dashboard)/invite/[token]/page.tsx` に招待リンク参加画面を実装する（T021に依存）
- [ ] T029 [US1] `app/(dashboard)/page.tsx` にトップ画面（支出一覧・支出追加フォーム）を実装する。SWRの `refetchInterval` を3〜5秒に設定し、数秒以内の自動反映を実現する（FR-013, research.md #1）（T022, T023に依存）
- [ ] T030 [US1] `app/api/groups/[groupId]/expenses/route.ts` と `[expenseId]/route.ts` の作成・編集・削除操作に、誰が・いつ・何を変更したかのログ出力を追加する（T011, 憲法V対応）

**Checkpoint**: User Story 1が単独で完結し、テスト可能（MVP）

---

## Phase 4: User Story 2 - 月次予算残額の可視化 (Priority: P2)

**Goal**: グループの月次予算に対する当月の残額をトップ画面で確認できる（FR-008, FR-009）

**Independent Test**: 月次予算を設定し、複数件の支出を記録した状態でトップ画面を開き、残額が正しく計算・表示されることを確認する（quickstart.md シナリオ5）

### Tests for User Story 2

- [ ] T031 [P] [US2] `tests/e2e/budget-display.spec.ts` にPlaywright E2Eテストを作成する: 予算20,000円設定→支出12,000円記録→残額8,000円表示→追加支出で予算超過→マイナス表示、を検証
- [ ] T032 [P] [US2] `tests/unit/budget-calculation.test.ts` にVitestユニットテストを作成する: 当月分のみ集計されること（前月分を含めない）、予算未設定時は残額が「未設定」扱いになること（FR-009, Edge Cases）

### Implementation for User Story 2

- [ ] T033 [US2] `app/api/groups/[groupId]/budget/route.ts` に `PUT /api/groups/{groupId}/budget` を実装する（FR-008）
- [ ] T034 [US2] `lib/budget.ts` に当月支出合計・残額の算出ロジックを実装する（暦月で集計し、予算未設定時はnullを返す。FR-009, data-model.md「導出値」）（T032に依存）
- [ ] T035 [US2] `app/api/groups/[groupId]/expenses/route.ts` のGETレスポンスに `currentMonthTotal` / `remaining` を追加する（contracts/api.md準拠）（T034に依存）
- [ ] T036 [US2] `app/(dashboard)/page.tsx` に予算設定UIと残額表示（マイナス時の強調表示、未設定時の表示を含む）を追加する（T033, T035に依存）

**Checkpoint**: User Story 1・2が両方とも単独で動作する

---

## Phase 5: User Story 3 - 支払い方法の記録（現金／モバイル決済） (Priority: P3)

**Goal**: 支出記録に支払い方法を記録・表示できる（FR-011）

**Independent Test**: 支出記録時に支払い方法を選択して保存し、記録一覧でその内訳が識別できることを確認する（quickstart.mdの検証観点に準拠）

### Tests for User Story 3

- [ ] T037 [P] [US3] `tests/e2e/payment-method.spec.ts` にPlaywright E2Eテストを作成する: 支払い方法「モバイル決済」を選択して記録し、一覧に「モバイル決済」として表示されることを検証

### Implementation for User Story 3

- [ ] T038 [US3] `app/(dashboard)/page.tsx` の支出追加・編集フォームに支払い方法（現金／モバイル決済）の選択UIを追加する（T029, T024に依存）
- [ ] T039 [US3] `app/(dashboard)/page.tsx` の支出一覧に、各記録の支払い方法を表示する

**Checkpoint**: すべてのユーザーストーリーが独立して機能する

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 全ストーリーを横断する仕上げ

- [ ] T040 [P] quickstart.md のシナリオ1〜6を通しで実行し、記載通りに動作するか確認・不一致があれば修正する
- [ ] T041 [P] `README.md` にセットアップ・起動手順（`npm run dev`, `npx prisma migrate dev`, `npm run test`, `npx playwright test`）を追記する
- [ ] T042 `npm run lint` を実行し、警告・エラーを解消する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。すぐ着手可能
- **Foundational (Phase 2)**: Setup完了後。**全ユーザーストーリーをブロックする**
- **User Stories (Phase 3-5)**: すべてFoundational完了後に着手可能。優先度順（P1→P2→P3）に進めることを推奨
- **Polish (Phase 6)**: 実装対象のユーザーストーリーが完了した後

### User Story Dependencies

- **User Story 1 (P1)**: Foundational完了後に着手可能。他ストーリーへの依存なし
- **User Story 2 (P2)**: Foundational完了後に着手可能。`GET /api/groups/{groupId}/expenses`（T022, US1）に統合する形のためUS1の当該タスク完了後が望ましいが、予算設定自体（T033）はUS1と独立して着手できる
- **User Story 3 (P3)**: US1の支出フォーム（T029）・編集エンドポイント（T024）に項目を追加する形のため、US1完了後の着手を推奨

### Within Each User Story

- テストを先に作成し、実装前に失敗することを確認する（憲法II）
- モデル（Phase 2で定義済み）→ APIルート → 画面 の順で実装する
- ストーリーが完了してから次の優先度に進む

### Parallel Opportunities

- Setup内の [P] タスク（T002〜T005）は並列実行可能
- Foundational内の [P] タスク（T008〜T011）は並列実行可能
- 各ユーザーストーリーのテストタスク（[P]が付いたもの）は並列実行可能
- US1完了後は、US2とUS3の一部タスク（予算設定APIなど）を並行して進められる

---

## Parallel Example: User Story 1

```bash
# User Story 1のテストを並列で作成する:
Task: "tests/e2e/expense-sharing.spec.ts にE2Eテストを作成"
Task: "tests/unit/expense-validation.test.ts にユニットテストを作成"
Task: "tests/unit/group-authorization.test.ts にユニットテストを作成"

# 画面コンポーネントを並列で作成する:
Task: "app/(auth)/signup/page.tsx を実装"
Task: "app/(auth)/login/page.tsx を実装"
```

---

## Implementation Strategy

### MVP First (User Story 1 のみ)

1. Phase 1: Setup を完了する
2. Phase 2: Foundational を完了する（**必須、全ストーリーをブロックする**）
3. Phase 3: User Story 1 を完了する
4. quickstart.md シナリオ1〜4で単独動作を検証する
5. この時点で「2人が支出を共有できる」というMVP相当の価値を持つ

### Incremental Delivery

1. Setup + Foundational → 基盤完成
2. User Story 1 追加 → 単独検証 → MVP相当
3. User Story 2 追加 → 単独検証（予算残額の可視化が加わる）
4. User Story 3 追加 → 単独検証（支払い方法の記録が加わる）
5. Phase 6 で仕上げ

---

## Notes

- [P] タスク = 異なるファイル、依存関係なし
- [Story] ラベルはユーザーストーリーへのトレーサビリティのため付与
- 各ユーザーストーリーは独立して完結・テスト可能であること
- 実装前にテストが失敗することを確認すること（憲法II、テストファースト絶対厳守）
- 論理的なタスクの区切りごとにコミットする
- 各チェックポイントで一度立ち止まり、そのストーリー単体の動作を確認する
