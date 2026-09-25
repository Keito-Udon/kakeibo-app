# Tasks: 支出のタイトルとメモ（Expense Title & Memo）

**Input**: Design documents from `/specs/004-expense-title-memo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/screens.md, quickstart.md

**Tests**: 憲法II（テストファースト、絶対厳守）により、各フェーズのテストを実装より先に作成し、実装前に
失敗することを確認する。spec の受け入れシナリオ・Edge Cases・成功基準の一つひとつに、それを検証するタスクを
対応づける（下記「仕様とテストの対応表」）。

**Organization**: 基盤（データの移行とAPI）→ US1（入力）→ US2（表示）→ 仕上げ。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（別ファイルで、未完了タスクへの依存がない）
- **[Story]**: 対応するユーザーストーリー（US1, US2）

## Path Conventions

- ロジック: `lib/`、部品: `components/`、API: `app/api/`、ユニットテスト: `tests/unit/`、E2E: `tests/e2e/`
- コマンドは WSL 経由で実行する

---

## Phase 1: Setup

- [X] T001 開発用DBを退避する: `mkdir -p ~/kakeibo-backups && cp prisma/dev.db ~/kakeibo-backups/dev-before-004-$(date +%Y%m%d%H%M%S).db`（T007の移行用。T008の移行確認のもとデータにも使う）

---

## Phase 2: Foundational（データの移行・入力チェック・API）

**Purpose**: `description` を `title` に、`memo` を追加し、APIと入力チェックを新しい形にする。この段階では
画面の見た目は変えず、既存の「内容」欄の値を `title` として送る

**⚠️ CRITICAL**: このフェーズが終わるまで US1・US2 に着手しない

### Tests for Foundational（実装前に作成し、失敗することを確認する）

- [X] T002 [P] `tests/unit/text.test.ts` を作成する。`countChars(s)`（見た目の1文字を1文字として数える。research.md #2）が、`"スーパー"` → 4、`"🍙"` → 1、`"👨‍👩‍👧"` → 1、濁点を後から付けた `"が"` → 1、`"a\nb"` → 3（改行も1文字）、`""` → 0 を返すことを検証する
- [X] T003 [P] `tests/unit/expense-validation.test.ts` を更新する（data-model.md「バリデーション」）。追加用スキーマについて: (a) `title` の欠落・空文字・空白だけ（`"   "`）を拒否、(b) `title` の前後の空白を除いて保存値にする（`"  スーパー  "` → `"スーパー"`）、(c) `title` は50文字を受け付け51文字を拒否、(d) 絵文字「🍙」×50のタイトルを受け付ける（見た目の文字数で数える）、(e) 改行を含む `title` を拒否、(f) `memo` を省略すると `""`、(g) `memo` の前後の空白を除き、空白と改行だけのメモは `""` になる、(h) `memo` の途中の改行と連続する空行（`"a\n\nb"`）はそのまま保つ、(i) `memo` は改行を含めて200文字を受け付け201文字を拒否、(j) `description` を送っても保存値に含まれない。編集用スキーマについて: (k) `memo: ""` を受け付ける、(l) `memo` を省略すると保存値に `memo` が含まれない（変更しない）、(m) `title` を送る場合は追加時と同じ条件で検証し、空白だけ（`"   "`）・51文字・改行を含む `title` を拒否する（FR-002は編集にも当てはまる）
- [X] T004 [P] 既存のテストで支出の「内容」を送る・読む箇所を `title` に書き換える: `tests/e2e/helpers.ts` の `addExpenseViaApi`（引数名 `description` → `title`、送る項目を `title` に）、`tests/e2e/authorization.spec.ts`（2か所）、`tests/e2e/member-spending.spec.ts`（`addPaidExpense`）、`tests/unit/day-expenses.test.ts`・`tests/unit/budget-calculation.test.ts`（Prismaで作る支出の `description` → `title`）。`tests/e2e/day-detail.spec.ts` の入力欄のテストID `expense-form-description` はUS1（T015）で変えるため、ここでは変えない

### Implementation for Foundational

- [X] T005 `prisma/schema.prisma` の `ExpenseRecord` で `description String` を `title String` に変え、`memo String @default("")` を加える（data-model.md）
- [X] T006 `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` で生成したSQLをもとに、`prisma/migrations/<timestamp>_expense_title_memo/migration.sql` を作る。表の作り直しのINSERTでは、`title` を `CASE WHEN length(description) <= 50 THEN description ELSE substr(description, 1, 50) END`、`memo` を `CASE WHEN length(description) <= 50 THEN '' ELSE description END` で埋める（research.md #1）（T005に依存）
- [X] T007 T001の退避を確認したうえで、開発用DBに `npx prisma migrate deploy` と `npx prisma generate` を実行し、移行前後で支出の件数・金額の合計が一致すること、全行で `title` が移行前の `description` と一致すること（開発用DBは全件50文字以下）を確認する（T006に依存）
- [X] T008 移行規則の確認（FR-007, SC-002, Edge Cases）: T001で退避したDBのコピー（`/tmp` に置く）に、旧スキーマのまま `description` がちょうど50文字、51文字、200文字（改行を含む）の支出を1件ずつ生SQLで追加してから `DATABASE_URL=file:<コピー>` で `migrate deploy` を実行し、(a) 50文字の行は `title` がそのまま・`memo` が空、(b) 51文字・200文字の行は `title` が先頭50文字・`memo` が全文（改行を含む）、(c) 件数・金額の合計が移行前と一致することを確かめ、結果を research.md #1 に追記する。確認後コピーを削除する（T006に依存）
- [X] T009 [P] `lib/text.ts` に `countChars(s)` を実装する（`Intl.Segmenter("ja", { granularity: "grapheme" })`。T002を通す）
- [X] T010 `lib/validation/expense.ts` を更新する（T003を通す。T009に依存）: `description` を削除し、`title`（`z.string().trim()` の後、1文字以上・`countChars` で50文字以下・改行を含まない）、`memo`（`z.string().trim()` の後、`countChars` で200文字以下。追加用は `.default("")`）を加える。`expenseUpdateSchema` は `partial()` のまま（`memo` の省略は変更なし）
- [X] T011 `app/api/groups/[groupId]/expenses/route.ts` の POST で、`description` の代わりに `title` と `memo` を保存する（`[expenseId]/route.ts` の PATCH はスキーマ経由で `title` / `memo` を更新するため変更不要なことを確認する）（T010に依存）
- [X] T012 画面を新しいデータの形に合わせる（見た目は変えない一時的な対応。US1・US2で置き換える）: `components/expense-form.tsx` は「内容」欄の値を `title` として送り、初期値の型の `description` を `title` にする。`app/(dashboard)/expenses/new/page.tsx`・`[expenseId]/edit/page.tsx` の初期値を `title: expense.title`（新規は `""`）にする。`components/day-expense-list.tsx` は `expense.title` を表示する（T011に依存）
- [X] T013 `npm run test`・`npm run test:e2e`・`npm run lint`・`npx tsc --noEmit` がすべて成功することを確認する

**Checkpoint**: データは `title` / `memo` に移行済みで、画面はこれまでどおり使える

---

## Phase 3: User Story 1 - タイトルとメモを分けて支出を記録する (Priority: P1) 🎯 MVP

**Goal**: 支出追加・編集画面で、タイトル（1行・必須・50文字）とメモ（複数行・任意・200文字）を入力でき、
文字数と上限が表示される（FR-001〜FR-004）

**Independent Test**: タイトル「スーパー」・2行のメモで記録し、編集画面で同じ内容（改行を含む）が表示される
ことを確認する（quickstart.md シナリオ1〜3）

### Tests for User Story 1（実装前に作成し、失敗することを確認する）

- [X] T014 [P] [US1] `tests/e2e/expense-memo.spec.ts` を作成する（US1 AC1〜5、Edge Cases）: カレンダーの「＋」から支出追加画面を開き、(1) `expense-form-title` に「スーパー」、`expense-form-memo` に「野菜・牛乳\n○○店」を入力して保存 → 編集画面（日別詳細の `day-expense-edit`）で `expense-form-title` が「スーパー」、`expense-form-memo` の値が「野菜・牛乳\n○○店」（AC1）、(2) タイトルだけで保存できる（AC2）、(3) タイトルが空・空白だけ（`"   "`）のとき、保存すると `expense-form-error` が表示され、URLが変わらない（AC3）、(4) タイトル51文字を入力すると `expense-form-title-count` が「51/50」で `data-over="true"` になり、保存すると `expense-form-error`（AC4）、メモ201文字でも同様に `expense-form-memo-count` が「201/200」・`data-over="true"`・保存でエラー、(5) 「🍙」×50のタイトルは `expense-form-title-count` が「50/50」・`data-over="false"` で、保存できる、(6) タイトルに「  スーパー  」と入力すると `expense-form-title-count` が「4/50」（前後の空白を数えない）、(7) メモのある支出を編集してメモを空にして保存 → 編集画面を開き直すと `expense-form-memo` が空（AC5）
- [X] T015 [P] [US1] `tests/e2e/day-detail.spec.ts` の入力欄のテストID `expense-form-description` を `expense-form-title` に書き換える（3か所）

### Implementation for User Story 1

- [X] T016 [US1] `components/expense-form.tsx` の「内容」欄を置き換える（contracts/screens.md）: タイトル（ラベル「タイトル」、1行の `Input`、`data-testid="expense-form-title"`）とメモ（ラベル「メモ（任意）」、4行の `textarea`、`data-testid="expense-form-memo"`、既存の入力欄と同じ見た目）。それぞれの下に、前後の空白を除いた `countChars` の文字数と上限（「12/50」「34/200」）を `expense-form-title-count` / `expense-form-memo-count` で表示し、上限を超えたら赤字にして `data-over="true"`（超えていなければ `"false"`）とする。`maxLength` は付けない（research.md #3）。送信する値は `title` と `memo`。初期値の型に `memo` を加える（T014, T015を通す）
- [X] T017 [US1] `app/(dashboard)/expenses/new/page.tsx` の初期値に `memo: ""`、`app/(dashboard)/expenses/[expenseId]/edit/page.tsx` の初期値に `memo: expense.memo` を加える（T016に依存）
- [X] T018 [US1] T014・T015 と既存のテストがすべて成功することを確認する

**Checkpoint**: タイトルとメモを分けて記録・編集できる（日別詳細の一覧はまだタイトルだけ）

---

## Phase 4: User Story 2 - 日別詳細でタイトルとメモを省略せずに読む (Priority: P2)

**Goal**: 日別詳細の一覧で、タイトルの下にメモの全文を改行を保って表示する（FR-005, FR-006, SC-001）

**Independent Test**: 2行のメモと200文字のメモを持つ支出の日別詳細で、全文が省略されず改行どおりに表示される
ことを確認する（quickstart.md シナリオ1, 4）

### Tests for User Story 2（実装前に作成し、失敗することを確認する）

- [X] T019 [US2] `tests/e2e/expense-memo.spec.ts` に表示のテストを追加する（US2 AC1〜4、SC-001、Edge Cases）: APIで、(a) タイトル「スーパー」・メモ「野菜・牛乳\n\n○○店」（連続する空行を含む）、(b) タイトル「長いメモ」・メモ200文字（改行なし、同じ文字の繰り返しではなく読み取れる文）、(c) タイトル「メモなし」・メモなし、の3件を同じ日に登録し、横幅390pxで日別詳細を開いて、(a) の `day-expense-title` が「スーパー」、`day-expense-memo` の `innerText` が「野菜・牛乳\n\n○○店」と一致する（改行・空行を保つ。AC1）、(b) の `day-expense-memo` の `innerText` が200文字の全文と一致し、要素の `scrollWidth` が `clientWidth` を超えない（省略・はみ出しなし。AC2, SC-001）、(c) の支出には `day-expense-memo` がない（AC3）。さらに、別のユーザーBが同じ日の日別詳細を開いたまま、Aが (a) のメモを `PATCH` で変更すると、Bの画面の `day-expense-memo` が数秒以内に新しい内容になる（AC4, FR-006）

### Implementation for User Story 2

- [X] T020 [US2] `components/day-expense-list.tsx` の各支出で、1行で切る表示（`truncate`）をやめ、タイトルを `day-expense-title`（折り返し可）、その下にメモがある場合だけ `day-expense-memo`（`whitespace-pre-wrap` と単語の途中でも折り返す指定、小さめの文字）で表示する。メモが `""` なら要素を出さない（contracts/screens.md）。表示用の型に `title` / `memo` を加える（T019を通す）
- [X] T021 [US2] T019 と既存のテストがすべて成功することを確認する

**Checkpoint**: 書いたメモを日別詳細で省略なく読める

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T022 [P] `README.md` の「主な機能」の支出の説明に、タイトル（必須・50文字）とメモ（任意・改行可・200文字）を追記し、`docs/deployment.md` の運用メモに「004（`expense_title_memo`）の移行では、既存の支出の内容がタイトルに移り、51文字以上のものは全文がメモにも入る。適用前に必ずバックアップする」旨を追記する
- [ ] T023 quickstart.md のシナリオ1〜5を確認し、横幅390pxで支出追加画面（文字数の表示を含む）と、長いメモのある日別詳細のスクリーンショットを撮って目視確認する（SC-003 の入力のしやすさも確かめる）
- [ ] T024 `npm run test`・`npm run test:e2e`・`npm run lint`・`npx tsc --noEmit` がすべて成功することを確認する

---

## 仕様とテストの対応表

| 仕様 | 検証するタスク |
|---|---|
| US1 AC1（タイトル＋改行つきメモを記録・編集画面で確認） | T014 (1) |
| US1 AC2（タイトルだけで保存） | T014 (2) |
| US1 AC3（空・空白だけのタイトルを拒否） | T003 (a)(m), T014 (3) |
| US1 AC4（51文字・201文字を拒否） | T003 (c)(i), T014 (4) |
| US1 AC5（編集でメモを消す） | T003 (k), T014 (7) |
| US2 AC1（メモの改行を保って表示） | T019 (a) |
| US2 AC2 / SC-001（長いメモを省略しない） | T019 (b) |
| US2 AC3（メモが空なら出さない） | T019 (c) |
| US2 AC4 / FR-006（自動反映） | T019 |
| Edge: 前後の空白の除去・空白だけのメモ | T003 (b)(g), T014 (6) |
| Edge: 見た目の1文字で数える（絵文字・改行） | T002, T003 (d)(i), T014 (5) |
| Edge: メモの改行・連続する空行を保つ | T003 (h), T019 (a) |
| Edge: タイトルに改行は入れられない | T003 (e) |
| Edge: 文字数と上限の表示 | T014 (4)(5)(6) |
| Edge: 既存データの移行 / FR-007 / SC-002 | T007, T008 |
| Edge: 編集中の削除（002の維持） | 既存の `day-detail.spec.ts` |
| FR-008（001〜003の維持） | T013, T018, T021, T024（既存テスト全件） |
| SC-003（30秒以内に記録） | T023（手動） |

---

## Dependencies & Execution Order

- **Setup → Foundational**: T001（退避）の後にT007（移行の適用）
- **Foundational**: 全ストーリーをブロックする
- **US1**: Foundational完了後
- **US2**: Foundational完了後（US1とは別ファイル。ただし T019 のテストは T014 と同じファイルなので、T014の後に追記する）
- **Polish**: US1・US2完了後

### Parallel Opportunities

- T002・T003・T004（テスト）は並列で作成できる
- T009（`lib/text.ts`）は T005〜T008 と並列
- T014・T015 は並列
- US2の実装（T020）は、US1の実装（T016・T017）と別ファイルなので並行できる

---

## Implementation Strategy

1. **Foundational**: データを移行し、画面はそのまま使える状態にする
2. **US1（MVP）**: タイトルとメモを分けて入力できる
3. **US2**: 日別詳細でメモを読める
4. **Polish**: ドキュメント・スクリーンショット・全テスト

---

## Notes

- 各タスクの完了は、対応するテストの成功で判断する（憲法II）
- 論理的なタスクの区切りごとにコミットする（`main` に直接）
- 本番（研究室マシン）への反映時は、`migrate deploy` の前に必ず `prisma/dev.db` をバックアップする
