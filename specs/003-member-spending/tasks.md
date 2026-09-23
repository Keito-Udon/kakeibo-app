# Tasks: メンバー別の使用額の可視化（Member Spending）

**Input**: Design documents from `/specs/003-member-spending/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/screens.md, quickstart.md

**Tests**: 憲法II（テストファースト、絶対厳守）により、各フェーズのテストを実装より先に作成し、実装前に
失敗することを確認する。

**Organization**: ユーザーストーリー単位でフェーズを分ける。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（別ファイルで、未完了タスクへの依存がない）
- **[Story]**: 対応するユーザーストーリー（US1, US2）

## Path Conventions

- ロジック: `lib/`、部品: `components/`、ユニットテスト: `tests/unit/`、E2Eテスト: `tests/e2e/`
- E2Eの共通手順は `tests/e2e/helpers.ts`（002で作成済み）を使う

---

## Phase 1: Setup / Phase 2: Foundational

**該当なし**。保存データの変更・新しい依存・全ストーリー共通の準備がない（plan.md「Technical Context」）。
002の月別API（`GET /api/groups/{groupId}/months/{yearMonth}`）とカレンダー画面をそのまま拡張する。

---

## Phase 3: User Story 1 - 表示中の月の、メンバーごとの支払額を一目で見る (Priority: P1) 🎯 MVP

**Goal**: カレンダー画面の左に、表示中の月のメンバーごとの支払額（支払者で集計）・割合の棒・%を表示し、
月の移動と3秒ごとの自動更新に追随させる（FR-001〜FR-004, FR-007〜FR-010）

**Independent Test**: 2人のグループで、Aが支払者3,000円・Bが支払者1,000円の支出を記録し、カレンダーの左に
A 3,000円・75%、B 1,000円・25%が表示されることを確認する（quickstart.md シナリオ1〜3, 5）

### Tests for User Story 1（実装前に作成し、失敗することを確認する）

- [X] T001 [P] [US1] `tests/unit/member-shares.test.ts` を作成する。純粋関数 `computeMemberShares(members, totalsByUserId)`（`members`: グループへの参加順に並んだ `{ userId, displayName }[]`、`totalsByUserId`: `Record<userId, number>`）について、data-model.md の定義どおりに次を検証する: (a) 全メンバーを含め、支払額のないメンバーは `amount: 0`（FR-003）、(b) `percent` は「`Math.round(amount / 月の支出合計 × 100)`」で、3,000円と1,000円なら75と25、(c) 1円ずつ3人なら各33（合計が100にならなくてよい。Edge Cases）、(d) 月の支出合計が0なら全員の `percent` が `null`、(e) 並び順は `amount` の降順、同額なら参加順、(f) `colorIndex` は並び替え後も参加順（0始まり）のまま変わらない、(g) 全員の `amount` の合計が月の支出合計と一致する（SC-002）
- [X] T002 [P] [US1] `tests/unit/budget-calculation.test.ts` に、`getMonthSummary(groupId, yearMonth)` の戻り値の `memberTotals` について次を追加する: (a) 記録した人（`createdById`）ではなく支払者（`paidById`）で数える（US1 AC2）、(b) `spentOn` が対象月の支出だけを数え、前後の月と他のグループの支出を含めない、(c) 支出のないメンバーも `amount: 0` で含む、(d) `memberTotals` の `amount` の合計が `spent` と一致する（SC-002）、(e) 予算開始月より前の月（`budget` が `null` の月）でも、その月に支出があれば `memberTotals` に支払額と `percent` が入る（Edge Cases）、(f) ある支出の `spentOn` を翌月に更新すると、今月の `memberTotals` からその金額が減り、翌月の `memberTotals` に加わる（Edge Cases、FR-008）
- [X] T003 [P] [US1] `tests/e2e/member-spending.spec.ts` を作成する（quickstart.md シナリオ1〜3, 5）: ユーザーAがグループを作成して予算を設定し（`createGroupWithBudget`）、ユーザーBが招待リンク（`POST /api/groups/{groupId}/invite` の `inviteUrl`）から参加する。Aが `POST /api/groups/{groupId}/expenses` で「支払者A・3,000円」と「支払者B・1,000円」（どちらもAが記録）を今月の日付で登録する → Aのカレンダーの `member-spending-item` が A, B の順で、`member-spending-name` が表示名、`member-spending-amount` が「3,000円」「1,000円」、`member-spending-percent` が「75%」「25%」であること → Bが支払者の支出を削除すると、Bは「0円」「0%」で表示され続け、Aは「100%」になること（US1 AC3） → 翌月へ移動すると全員「0円」「支出なし」になること（US1 AC4〜5） → Bのカレンダーを開いたまま、Aが支出を追加し、別の支出の支払者を `PATCH` でBに変えると、Bの画面の左の列が操作なしで数秒以内に更新されること（US1 AC6, FR-008） → `GET /api/groups/{groupId}/months/{今月}` の `memberTotals` の `amount` の合計が `spent` と一致すること（SC-002）

### Implementation for User Story 1

- [X] T004 [US1] `lib/member-spending.ts` を作成する（T001を通す）: 純粋関数 `computeMemberShares` と、`getMemberTotals(groupId, yearMonth)`（`GroupMember` を `joinedAt`, `id` の昇順で読み、`ExpenseRecord` を `groupId` と `spentOn`（`${yearMonth}-01` 以上 `${yearMonth}-31` 以下）で絞って `paidById` ごとに `groupBy` し、`computeMemberShares` に渡す）。戻り値は contracts/api.md の `memberTotals` の形（`userId`, `displayName`, `amount`, `percent: number | null`, `colorIndex`）
- [X] T005 [US1] `lib/budget.ts` の `getMonthSummary` が `memberTotals: await getMemberTotals(groupId, yearMonth)` を返すようにし、型 `MonthSummaryResponse` に `memberTotals` を加える（T002を通す。T004に依存）。月別APIのルートは `getMonthSummary` の結果をそのまま返すため変更不要
- [X] T006 [P] [US1] `components/member-spending.tsx` を作成する（クライアントコンポーネント）。T004・T005と並列に進めるため、`memberTotals` の要素の型は `lib/member-spending.ts` から import せず、contracts/api.md の形（`userId`, `displayName`, `amount`, `percent: number | null`, `colorIndex`）に合わせて部品の中で定義する: `memberTotals` を受け取り、ルートに `data-testid="member-spending"`、各メンバーを `member-spending-item` とし、表示名（`member-spending-name`、省略せず `break-all` で折り返す）、支払額（`member-spending-amount`、`formatYen`、省略しない）、割合の棒（幅 = `percent`%、色 = 6色の並びの `colorIndex % 6` 番目）、割合（`member-spending-percent`、「75%」、`percent` が `null` なら「支出なし」）を縦に並べる（contracts/screens.md）。この段階では列の幅を `w-44`（176px）の固定とする（狭い画面向けの調整はUS2のT010）
- [X] T007 [US1] `components/month-calendar.tsx` の上部（グループ名・年月・残額）の下を横並びにし、左に `MemberSpending`（`data?.memberTotals`、読み込み中は空の列）、右に既存のカレンダーのグリッドを置く（FR-004）。カレンダー側は `min-w-0 flex-1` とする。取得は既存の `useSWR`（3秒ポーリング）を共用し、左の列のための取得は増やさない（research.md #2）（T005, T006に依存）
- [X] T008 [US1] T001〜T003 と既存のユニットテスト・E2E（002の8本）がすべて成功することを確認する

**Checkpoint**: 左の列にメンバーごとの支払額と割合が表示され、月の移動・自動更新に追随する（広い画面では完成）

---

## Phase 4: User Story 2 - 狭い画面でも、正確な金額とメンバー名をそのまま読む (Priority: P2)

**Goal**: 横幅360px・390pxでも、左の列の表示名・支払額を省略せず、カレンダーの日付マスの金額もはみ出さない
配置にする（FR-005, FR-006, FR-009, SC-003）

**Independent Test**: 390px・360pxでカレンダーを開き、長い表示名・6桁の支払額・4桁の日別合計がある状態で、
すべて省略・はみ出しなく読めることを計測する（quickstart.md シナリオ4）

### Tests for User Story 2（実装前に作成し、失敗することを確認する）

- [ ] T009 [US2] `tests/e2e/member-spending.spec.ts` に配置のテストを追加する（quickstart.md シナリオ4）: ユーザーA（今月の支払額123,456円。1日にまとめず、日別合計が「9,999」「3,480」「1,200」「1.3万」になる日を含める）と、表示名20文字のユーザーB（例: 「とても長い表示名のメンバーさんです」、今月の支払額1,234,567円＝7桁。Edge Cases）を用意し、ビューポート幅390pxと360px（高さ760px）それぞれで、(a) `member-spending-name` のテキストが各表示名と完全一致し、`member-spending-amount` が「123,456円」「1,234,567円」と完全一致する、(b) すべての `calendar-day-amount-*` 要素について `scrollWidth` が親のマス（`calendar-day-*`）の `clientWidth` を超えない、(c) `document.documentElement.scrollWidth` が `window.innerWidth` を超えない（横スクロールなし）、(d) `member-spending` の右端（`boundingBox` の x + width）がカレンダーのグリッドの左端以下にある（左側に置く。FR-004）、を検証する。さらに幅1024pxで (d) と、`member-spending` の幅が176pxであること（640px以上の配置。research.md #1）を検証する。US1の固定幅（176px）のままでは390px・360pxで失敗することを確認する

### Implementation for User Story 2

- [ ] T010 [US2] research.md #1 の表のとおりに、画面幅640px未満と以上で配置を切り替える: `components/member-spending.tsx` の列幅を `w-[88px] sm:w-44`、`components/month-calendar.tsx` の左の列とカレンダーの間を `gap-1 sm:gap-3`、画面の左右の余白を `px-2 sm:px-4`、日付マスの金額（`calendar-day-amount-*`）の文字を `text-[10px] tracking-tighter sm:text-[11px] sm:tracking-normal`、日付マスに `min-w-0` と `p-0.5` を指定する（T009を通す）
- [ ] T011 [US2] T009 と既存のテストがすべて成功することを確認する

**Checkpoint**: スマホの幅でも、左の列とカレンダーが両方とも省略・はみ出しなく読める

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T012 [P] `README.md` の「主な機能」のカレンダーの説明に、メンバーごとの支払額と割合の表示を追記する
- [ ] T013 quickstart.md のシナリオ1〜5を確認し、横幅390px・360px・1024pxでスクリーンショットを撮って表示を目視確認する（長い表示名の折り返し、割合の棒の色が参加順で固定されていること）
- [ ] T014 `npm run test`・`npm run test:e2e`・`npm run lint`・`npx tsc --noEmit` がすべて成功することを確認する

---

## Dependencies & Execution Order

### Phase Dependencies

- **US1 (Phase 3)**: 依存なし（002の実装の上に作る）
- **US2 (Phase 4)**: US1完了後（左の列が存在してから配置を調整する）
- **Polish (Phase 5)**: US1・US2完了後

### Within Each User Story

- テストを先に書き、実装前に失敗することを確認する（憲法II）
- `lib/`（純粋関数 → DB集計）→ `lib/budget.ts`（API応答）→ 部品 → カレンダーへの組み込み の順

### Parallel Opportunities

- T001・T002・T003（テスト）は並列で作成できる
- T006（部品）は T004・T005 と並列で作れる（`memberTotals` の形は contracts/api.md で決まっている）
- T012 は他の仕上げタスクと並列

---

## Parallel Example: User Story 1

```bash
Task: "tests/unit/member-shares.test.ts を作成"
Task: "tests/unit/budget-calculation.test.ts に memberTotals のテストを追加"
Task: "tests/e2e/member-spending.spec.ts を作成"
```

---

## Implementation Strategy

### MVP First（US1のみ）

1. US1で集計と左の列を作る。広い画面ではこの時点で完成し、スマホでも表示はされる（列が広く、日付マスが
   窮屈になる）
2. 動作を確認してから US2 で狭い画面の配置を仕上げる

### Incremental Delivery

1. US1 → メンバーごとの支払額と割合が見える
2. US2 → スマホの幅でも両方読める
3. Polish → README とスクリーンショットでの確認

---

## Notes

- 各タスクの完了は、対応するテストの成功で判断する（憲法II）
- 論理的なタスクの区切りごとにコミットする（`main` に直接）
- コマンド（テスト・lint）は WSL 経由で実行する
