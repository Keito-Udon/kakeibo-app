# Tasks: カレンダー表示と月別予算（Calendar & Monthly Budget）

**Input**: Design documents from `/specs/002-calendar-monthly-budget/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/screens.md, quickstart.md

**Tests**: 憲法II（テストファースト、絶対厳守）により、各フェーズのテストを実装より先に作成し、
実装前に失敗することを確認する。

**Organization**: ユーザーストーリー単位でフェーズを分ける。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（別ファイルで、未完了タスクへの依存がない）
- **[Story]**: 対応するユーザーストーリー（US1〜US4）

## 進め方の方針（旧画面との並行期間）

001の1画面ダッシュボード（`components/dashboard.tsx`、`/` に表示）は、**最終フェーズ（Phase 7）まで
残して動かし続ける**。新しい画面（`/months/...` など）はURLで直接開ける形で先に作り、各フェーズで
テストする。すべての新画面がそろった Phase 7 で、`/` の行き先をカレンダーに切り替え、旧画面と
不要になったAPIを削除する。

**理由**: 旧画面は支出追加・予算設定・招待・ログアウトを1画面で担っている。先に削除すると、
代わりの画面ができるまでの間、それらの機能が使えなくなり、憲法IV（各単位で動作する状態を保つ）に
反する。

**US1〜US2の間の既知の制約**: 予算画面はUS2（T031）で作るため、US1完了からUS2完了までの間は、予算が
未設定のグループでカレンダー（`/months/...`）を開くと、`requireBudgetedGroup()` の転送先がまだ存在せず
404になる。旧画面（`/`）の利用には影響しない。US2の完了で解消する。

**テストIDの注意**: 旧画面と新画面が同時に存在する期間があるため、新画面のテストIDは旧画面
（`budget-input`, `budget-submit`, `expense-amount` など）と重ならない名前にする（各タスクに記載）。

## Path Conventions

- 画面: `app/(dashboard)/**/page.tsx`、部品: `components/`、API: `app/api/**/route.ts`
- ロジック: `lib/`、ユニットテスト: `tests/unit/`、E2Eテスト: `tests/e2e/`
- 年月は `YYYY-MM`、日付は `YYYY-MM-DD`、いずれも日本時間基準（research.md #4）

---

## Phase 1: Setup（共通の準備）

**Purpose**: 以降のテストで共通に使う手順の整理と、データ移行の前提確認

- [X] T001 [P] `tests/e2e/helpers.ts` を作成し、既存の4つのE2Eテスト（`tests/e2e/expense-sharing.spec.ts`, `budget-display.spec.ts`, `payment-method.spec.ts`, `logout.spec.ts`）に重複している `signup` / `login` / 一意なメールアドレス生成を移して、4ファイルから import する形に書き換える。書き換え後も4本とも成功すること
- [X] T002 既存の `prisma/dev.db` で、Prismaの `DateTime` 列（`ExpenseRecord.createdAt`）がSQLite上でどの形式（数値のミリ秒／文字列）で保存されているかを `SELECT typeof(createdAt), createdAt FROM ExpenseRecord LIMIT 3` で確認し、結果と、日本時間の日付（`YYYY-MM-DD`）へ変換するSQL式を `specs/002-calendar-monthly-budget/research.md` の #6 に追記する

**Checkpoint**: E2Eの共通手順が1か所にまとまり、移行SQLの書き方が決まっている

---

## Phase 2: Foundational（全ストーリーの前提）

**Purpose**: データ構造の変更と移行、日付・繰越計算・選択中グループの共通処理。旧画面は新しい
データ構造の上でそのまま動かし続ける

**⚠️ CRITICAL**: このフェーズが終わるまで、どのユーザーストーリーにも着手しない

### Tests for Foundational（実装前に作成し、失敗することを確認する）

- [X] T003 [P] `tests/unit/date.test.ts` を作成する。`lib/date.ts` の次の関数を検証する: `todayJst(now)`（UTC 2026-09-22T15:30Z → `"2026-09-23"`、UTC 2026-09-23T14:59Z → `"2026-09-23"`）、`currentYearMonthJst(now)`、`isValidYearMonth`（`"2026-09"` 可、`"2026-13"` `"2026-9"` 不可）、`isValidDate`（`"2026-02-28"` 可、`"2026-02-30"` `"2026-9-5"` 不可）、`addMonths("2026-12", 1) === "2027-01"`、`addMonths("2026-01", -1) === "2025-12"`、`daysInMonth("2026-02") === 28`、`yearMonthOf("2026-09-05") === "2026-09"`
- [X] T004 [P] `tests/unit/budget-carryover.test.ts` を作成する。純粋関数 `computeMonthSummary(budgets, monthlyTotals, targetYearMonth)`（`budgets`: `{ yearMonth, amount }[]`、`monthlyTotals`: `Record<"YYYY-MM", number>`）について、data-model.md「導出値」の各ケースを検証する: (a) 予算が1件もない → `budget: null, remaining: null`、(b) 表示月が予算開始月より前 → `budget: null, remaining: null`、(c) 予算開始月の繰越は0（設定20,000・支出12,000 → 残額8,000）、(d) 余りの繰越（9月 設定20,000・支出15,000 → 10月は設定20,000を引き継ぎ、繰越5,000、予算25,000）、(e) 超過の繰越（9月 支出23,000 → 10月 設定20,000・繰越−3,000・予算17,000）、(f) 超過が2か月続くとマイナスが積み重なる、(g) 10月だけ設定25,000にしても9月の設定額は20,000のまま、11月は25,000を引き継ぐ、(h) 支出のない未来の月にも繰越が伝わる、(i) 戻り値の `spent` はその月の支出合計
- [X] T005 [P] `tests/unit/expense-validation.test.ts` を更新する: 追加用スキーマで `spentOn` が必須であること、`"2026-02-30"` や `"2026/09/05"` が拒否されること、過去・未来の実在する日付は受け付けること、編集用スキーマでは `spentOn` が任意であること。あわせて予算の入力スキーマ `monthlyBudgetInputSchema`（`{ amount }`）が `0`・負数・小数を拒否し、1以上の整数を受け付けること（FR-007, FR-022）
- [X] T006 [P] `tests/unit/budget-calculation.test.ts` を書き換える。DBを使う `getMonthSummary(groupId, yearMonth)` が、(a) `spentOn` が対象月の支出だけを集計し、前後の月を含めない、(b) `dailyTotals` が日ごとの合計を返し、支出のない日のキーを含まない、(c) `MonthlyBudget` の設定額と繰越を `computeMonthSummary` と同じ規則で返すことを検証する。あわせて `setMonthlyBudget(groupId, yearMonth, amount, userId)` が同じ年月なら上書きし、他の月を変えず、`updatedById` を記録すること、同じ年月へ別のユーザーが続けて2回保存すると後から保存した値と `updatedById` が残ること（Edge Cases: 予算の同時変更）、`hasAnyBudget(groupId)` が1件以上で `true` を返すことを検証する
- [X] T007 [P] `tests/unit/selected-group.test.ts` を作成する。`resolveSelectedGroup(userId)`（`lib/groups.ts`）が、(a) 未所属なら `null`、(b) `selectedGroupId` が所属グループなら、そのグループを返す、(c) `selectedGroupId` がnullまたは所属していないグループなら、`joinedAt` が最も古い所属グループを返し、`User.selectedGroupId` をその値で保存し直すことを検証する

### Implementation for Foundational

- [X] T008 `prisma/schema.prisma` を data-model.md のとおり変更する: `MonthlyBudget` を追加（`id` cuid, `groupId`, `yearMonth` String, `amount` Int, `createdAt`, `updatedAt` @updatedAt, `updatedById`、`@@unique([groupId, yearMonth])`、Group・User へのリレーション）。`ExpenseRecord` に `spentOn String` と `@@index([groupId, spentOn])` を追加。`User` に `selectedGroupId String?`（Groupへのリレーション）を追加。`Group.monthlyBudget` を削除
- [X] T009 `npx prisma migrate dev --create-only --name monthly_budget_calendar` でマイグレーションを生成し、`prisma/migrations/<timestamp>_monthly_budget_calendar/migration.sql` に data-model.md「既存データの移行」の手順1〜5をSQLで追記する（T002で決めた変換式を使う。`MonthlyBudget.yearMonth` はマイグレーション実行時点の日本時間の年月、`updatedById` はそのグループで最初に参加したメンバー、`selectedGroupId` は最初に参加したグループ）。移行前に `prisma/dev.db` をコピーして退避し、`npx prisma migrate dev` で適用したあと、支出の件数・金額合計と、予算設定済みグループ数＝`MonthlyBudget` 行数が移行前後で一致することを確認する（T002, T008に依存）
- [X] T010 [P] `lib/date.ts` を実装する（T003を通す）。`Intl.DateTimeFormat` に `timeZone: "Asia/Tokyo"` を指定して今日・今月を求め、月の計算は `Date.UTC` で行う。日付ライブラリは追加しない（research.md #4）
- [X] T011 `lib/validation/expense.ts` を更新する（T005を通す。`lib/date.ts` の `isValidDate` を使うためT010に依存）。`expenseInputSchema` に `spentOn`（`YYYY-MM-DD` かつ `isValidDate` を満たすこと）を追加し、`expenseUpdateSchema` では任意にする。`budgetInputSchema` を `monthlyBudgetInputSchema = z.object({ amount: z.number().int().positive() })` に置き換える
- [X] T012 `lib/budget.ts` を書き換える（T004, T006を通す）: 純粋関数 `computeMonthSummary`（research.md #5の手順）、`getMonthSummary(groupId, yearMonth)`（`MonthlyBudget` 全件と、予算開始月〜対象月の支出を `spentOn` で `groupBy` した日別合計を読み、月別に足して計算。戻り値は contracts/api.md の `GET /months/{yearMonth}` のレスポンス形）、`setMonthlyBudget`（upsert、`logger.info("budget.set", { groupId, yearMonth, amount, userId })`）、`hasAnyBudget`。旧 `getBudgetSummary` は削除する（T009, T010に依存）
- [X] T013 `lib/active-group.ts` を作成する（T007を通す）: `resolveSelectedGroup(userId)`（Vitestから直接テストできるよう、DBだけを使うこの関数は `lib/groups.ts` に置いた）、`requireActiveGroup()`（未ログインは `/login`、未所属は `/` へ `redirect()`。戻り値は `{ userId, group }`）、`requireBudgetedGroup()`（上記に加え、`hasAnyBudget` が false なら `/months/{今月}/budget` へ `redirect()`。FR-003）。Proxy は使わない（research.md #3）（T012に依存）
- [X] T014 支出APIを新しいデータ構造に合わせる: `app/api/groups/[groupId]/expenses/route.ts` の POST で `spentOn` を保存し、`paidById` がそのグループのメンバーでなければ400を返す。`app/api/groups/[groupId]/expenses/[expenseId]/route.ts` の PATCH で `spentOn` を更新できるようにする。作成・編集のログに `spentOn` を加える（T011, T012に依存）
- [X] T015 旧画面を動かし続けるための互換対応を行う: `app/api/groups/[groupId]/expenses/route.ts` の GET は `getMonthSummary(groupId, 今月)` から旧レスポンス形（`monthlyBudget` ＝ 設定額、`currentMonthTotal` ＝ 支出合計、`remaining`）を組み立てる。`app/api/groups/[groupId]/budget/route.ts` の PUT は `setMonthlyBudget(groupId, 今月, ...)` を呼ぶ。`components/dashboard.tsx` の支出追加フォームは `spentOn: todayJst()` を送る（これらは Phase 7 で削除する一時的な対応）（T012, T014に依存）
- [X] T016 選択中グループを更新する処理を入れる: `app/api/groups/route.ts` の POST から `monthlyBudget` を削除し、作成後に `User.selectedGroupId` を作成したグループにする。`lib/invites.ts` の `joinGroupByToken` で、参加（既にメンバーの場合を含む）後に `selectedGroupId` を参加したグループにする。`app/(dashboard)/page.tsx` の `prisma.groupMember.findFirst` を `resolveSelectedGroup` に置き換える（T013に依存）
- [X] T017 `npm run test`・`npm run test:e2e`・`npm run lint` を実行し、すべて成功することを確認する（旧画面のE2E 4本がこの時点でも通ること）

**Checkpoint**: 新しいデータ構造に移行済みで、旧画面はこれまでどおり使える

---

## Phase 3: User Story 1 - カレンダーで月の支出を把握する (Priority: P1) 🎯 MVP

**Goal**: `/months/{YYYY-MM}` でその月のカレンダー・日別合計・残額を表示し、前後の月へ移動でき、
他の端末での変更が数秒以内に反映される（FR-013〜FR-016, FR-021, FR-029の表示部分）

**Independent Test**: 予算設定済みのグループで支出をAPIから記録し、`/months/2026-09` を直接開いて
日別合計・残額・月移動・自動反映を確認する（quickstart.md シナリオ2）

### Tests for User Story 1（実装前に作成し、失敗することを確認する）

- [X] T018 [P] [US1] `tests/unit/calendar-grid.test.ts` を作成する。`buildMonthGrid(yearMonth)` が日曜始まりの週の配列を返すことを検証する: `"2026-09"` は1日が火曜なので先頭に空マス2つ・30日分、`"2026-02"` は1日が日曜で28日なのでちょうど4週、各週は7マス
- [X] T019 [P] [US1] `tests/unit/format.test.ts` を作成する。`formatDayAmount` が `1500 → "1,500"`、`9999 → "9,999"`、`10000 → "1万"`、`12345 → "1.2万"`、`15050 → "1.5万"` を返し（1万円以上は小数第1位で四捨五入し、`.0` は付けない。research.md #7）、`formatYen` が `-3000 → "-3,000円"` を返すことを検証する
- [X] T020 [P] [US1] `tests/e2e/calendar.spec.ts` を作成する（quickstart.md シナリオ2と US1 の受け入れシナリオ）: helpers でユーザー作成・グループ作成を行い、予算20,000円を設定する（US1の時点では予算画面がまだないため、旧画面の `budget-input` / `budget-submit` で設定する。US2のT034で共通手順 `createGroupWithBudget` に置き換える）。そのうえでカレンダーの `data-group-id` からグループIDを取得して、`page.request.post` で9月5日の1,000円・500円、9月10日の2,000円を登録する。`/months/{今月}` を直接開き、`calendar-day-amount-{日付}` に `1,500` / `2,000` が表示され、他の日に金額がないこと、`calendar-remaining` が `16,500円` であること、`calendar-next` で翌月に移ると残額が `36,500円` になること、`calendar-prev` で予算開始月より前の月に移ると `予算なし` と表示されることを検証する。さらに、別のブラウザコンテキスト（同じユーザー）で開いたカレンダーが、APIでの支出追加を操作なしで数秒以内に反映すること、グループ外のユーザーが `GET /api/groups/{groupId}/months/{年月}` にアクセスすると403になることを検証する（テストの日付は実行月に合わせて組み立てる）

### Implementation for User Story 1

- [X] T021 [P] [US1] `lib/calendar.ts` に `buildMonthGrid(yearMonth)` を実装する（T018を通す。`lib/date.ts` を使う）
- [X] T022 [P] [US1] `lib/format.ts` に `formatDayAmount` と `formatYen` を実装する（T019を通す）
- [X] T023 [US1] `app/api/groups/[groupId]/months/[yearMonth]/route.ts` に GET を実装する: 未認証401、非メンバー403、`yearMonth` の形式不正400、成功時は `getMonthSummary` の結果を返す（contracts/api.md）
- [X] T024 [US1] `components/month-calendar.tsx` を作成する（クライアントコンポーネント）: `useSWR` で `GET /months/{yearMonth}` を `refreshInterval: 3000` で取得し、上部にグループ名（`calendar-group-name`）、年月（`calendar-year-month`、例「2026年9月」）、残額（`calendar-remaining`。マイナスは赤字、`remaining` が null なら「予算なし」）、前月・翌月リンク（`calendar-prev` / `calendar-next`）を表示し、本体に `buildMonthGrid` の7列グリッド（各マス `calendar-day-{YYYY-MM-DD}`、金額 `calendar-day-amount-{YYYY-MM-DD}` を `formatDayAmount` で表示、支出のない日は金額なし）を表示する。ルート要素に `data-testid="calendar"` と `data-group-id` を付ける（contracts/screens.md「カレンダー」）
- [X] T025 [US1] `app/(dashboard)/months/[yearMonth]/page.tsx` を作成する: `await params` で `yearMonth` を受け取り、`isValidYearMonth` でなければ `notFound()`。`requireBudgetedGroup()` で選択中グループを取得して `MonthCalendar` を表示する（T013, T023, T024に依存）
- [X] T026 [US1] T018〜T020 がすべて成功し、旧画面のE2E 4本も引き続き成功することを確認する

**Checkpoint**: カレンダー画面がURLで開け、単独で検証できる（旧画面も引き続き使える）

---

## Phase 4: User Story 2 - 初回の予算決定と月ごとの予算変更 (Priority: P1)

**Goal**: 予算決定・変更画面を作り、グループ初回はログイン後に予算決定画面を経由させる。カレンダーの
年月から予算変更画面に移れる（FR-001の(2), FR-002, FR-003, FR-005〜FR-012）

**Independent Test**: 新しいグループで予算決定画面を経てカレンダーに進み、年月タップで月ごとに違う
設定額を登録し、繰越が正しく反映されることを確認する（quickstart.md シナリオ1・4）

### Tests for User Story 2（実装前に作成し、失敗することを確認する）

- [ ] T027 [P] [US2] `tests/e2e/first-run.spec.ts` を作成する（quickstart.md シナリオ1、US2 AC1〜2）: サインアップ・ログイン → グループ作成 → `budget-form` が表示され、初回の見出し「予算を決める」があり `budget-form-back` がないこと → `/months/{今月}` を直接開くと予算画面に戻されること → `budget-form-amount` に20000を入れて `budget-form-submit` → URLが `/months/{今月}` になり `calendar-remaining` が `20,000円` → ログアウト・再ログインで予算画面を経由しない（URLに `/budget` を含まない）こと
- [ ] T028 [P] [US2] `tests/e2e/budget-carryover.spec.ts` を作成する（quickstart.md シナリオ4、US2 AC4〜9）: `calendar-year-month` をタップすると今月の予算画面に移り、設定額20,000と繰越0（`budget-form-carryover`）が表示される → 翌月に移動し設定額を25,000に変更すると、翌月の予算が25,000＋今月の残額になり、今月の設定額は20,000のまま → APIで今月の支出を合計23,000円にすると、今月の `calendar-remaining` がマイナス（赤字）の `-3,000円`、翌月が `22,000円` になる → 予算画面で0を保存しようとするとエラーが表示され保存されない

### Implementation for User Story 2

- [ ] T029 [US2] `app/api/groups/[groupId]/months/[yearMonth]/budget/route.ts` に PUT を実装する: 未認証401、非メンバー403、`yearMonth` 形式不正または `monthlyBudgetInputSchema` 不合格（`amount` は1以上の整数）で400、成功時は `setMonthlyBudget` を呼んで `{ yearMonth, amount }` を返す（contracts/api.md）
- [ ] T030 [US2] `components/budget-form.tsx` を作成する（クライアントコンポーネント）: 年月の見出し、設定額の入力（`budget-form-amount`、初期値は引き継ぎ後の設定額。未設定なら空）、前月からの繰越額（`budget-form-carryover`）、保存ボタン（`budget-form-submit`）、エラー表示。初回モードでは見出しを「予算を決める」にし、戻るリンク（`budget-form-back` → `/months/{yearMonth}`）を表示しない。保存に成功したら SWR の `mutate` で `/months/{yearMonth}` のキャッシュを無効化し、`router.push("/months/{yearMonth}")` する（contracts/screens.md「予算決定・変更」）
- [ ] T031 [US2] `app/(dashboard)/months/[yearMonth]/budget/page.tsx` を作成する: `yearMonth` を検証（不正なら `notFound()`）、`requireActiveGroup()` で選択中グループを取得（予算未設定でも開ける）、`getMonthSummary` で現在の設定額と繰越を読み、`hasAnyBudget` が false なら初回モードで `BudgetForm` を表示する（T029, T030に依存）
- [ ] T032 [US2] `components/month-calendar.tsx` の年月表示（`calendar-year-month`）を `/months/{yearMonth}/budget` へのリンクにする（FR-006）
- [ ] T033 [US2] `app/(dashboard)/page.tsx` の振り分けを更新する: 選択中グループに予算が1件もなければ `/months/{今月}/budget` へ `redirect()` する。未所属のときのグループ作成フォームと、予算設定済みのときの旧画面表示はこのフェーズでは変えない（FR-001の(2)）
- [ ] T034 [US2] `tests/e2e/helpers.ts` に「グループを作成し、表示された予算画面で初回の予算を保存する」手順 `createGroupWithBudget(page, name, amount)` を追加し、旧画面のE2E 4本と `calendar.spec.ts` をこの手順を使う形に更新する（グループ作成直後に予算画面が挟まるようになったため）
- [ ] T035 [US2] T027・T028 と、既存のE2E（旧画面4本・`calendar.spec.ts`）がすべて成功することを確認する

**Checkpoint**: 初回の予算決定の流れと月ごとの予算変更・繰越が動く。カレンダー（US1）と組み合わせて
主要な表示がそろう

---

## Phase 5: User Story 3 - 日別の支出詳細と支出の追加・編集・削除 (Priority: P2)

**Goal**: 日別詳細・支出追加・支出編集の3画面を作り、カレンダーからつなぐ（FR-016〜FR-022）

**Independent Test**: カレンダーの日付から日別詳細へ移り、追加・編集（支出日の変更を含む）・削除が
カレンダーの日別合計と残額に反映されることを確認する（quickstart.md シナリオ3）

### Tests for User Story 3（実装前に作成し、失敗することを確認する）

- [ ] T036 [P] [US3] `tests/unit/day-expenses.test.ts` を作成する。`getDayExpenses(groupId, date)` が、その日の `spentOn` の支出だけを `createdAt` 昇順で返し、`total` がその合計であること、他のグループの支出を含まないことを検証する
- [ ] T037 [P] [US3] `tests/e2e/day-detail.spec.ts` を作成する（quickstart.md シナリオ3、US3 AC1〜7）: カレンダーの `calendar-add` から開いた `expense-form` の支出日（`expense-form-date`）が今日であること → 支出を2件追加（うち1件は支払い方法「モバイル決済」）→ 保存後は `/days/{支出日}` に移り、`day-expense-item` に金額・内容・支払者・支払い方法（「モバイル決済」の表示を含む）が出ること → 日別詳細の `day-add` から開くと支出日がその日であること → `day-expense-edit` で1件の支出日を翌日に変えると、翌日の詳細に移り、カレンダーの両日の金額が更新されること → `day-expense-delete` で削除すると一覧から消え、カレンダーの金額と残額が更新されること → 支出のない日は `day-empty` が表示されること → 0円・マイナスの金額は保存できないこと（FR-022） → 別のコンテキストで同じ支出を削除した後に編集を保存すると「既に削除されています」の旨が表示されること → グループ外のユーザーが `GET /api/groups/{groupId}/days/{日付}` にアクセスすると403になること

### Implementation for User Story 3

- [ ] T038 [US3] `lib/expenses.ts` に `getDayExpenses(groupId, date)` を実装する（T036を通す）
- [ ] T039 [US3] `app/api/groups/[groupId]/days/[date]/route.ts` に GET を実装する: 未認証401、非メンバー403、`date` の形式不正400、成功時は `{ date, total, expenses }`（contracts/api.md）
- [ ] T040 [P] [US3] `components/expense-form.tsx` を作成する（追加・編集で共用のクライアントコンポーネント）: 金額（`expense-form-amount`）、内容（`expense-form-description`）、支払者（`expense-form-paid-by`、グループのメンバーから選択）、支払い方法（`expense-form-payment-method`、現金／モバイル決済）、支出日（`expense-form-date`）、保存（`expense-form-submit`）、戻る（`expense-form-back`、ブラウザ履歴で戻る）、エラー表示。保存先は、追加なら `POST /api/groups/{groupId}/expenses`、編集なら `PATCH .../expenses/{expenseId}`。編集で404が返ったら「この支出は既に削除されています」と表示する。成功したら月・日のSWRキャッシュを無効化し、`router.push("/days/{保存した支出日}")` する（contracts/screens.md「支出追加・支出編集」）
- [ ] T041 [US3] `app/(dashboard)/expenses/new/page.tsx` を作成する: `requireBudgetedGroup()`、`searchParams` の `date` が `isValidDate` を満たせばそれを、なければ今日を支出日の初期値にして `ExpenseForm` を表示する（FR-018）（T040に依存）
- [ ] T042 [US3] `app/(dashboard)/expenses/[expenseId]/edit/page.tsx` を作成する: `requireBudgetedGroup()`、支出が存在しないか選択中グループのものでなければ `notFound()`、既存の値を初期値にして `ExpenseForm` を表示する（FR-020）（T040に依存）
- [ ] T043 [US3] `components/day-expense-list.tsx` を作成する（クライアントコンポーネント）: `useSWR` で `GET /days/{date}` を `refreshInterval: 3000` で取得し、日付と合計、各支出（`day-expense-item`）の金額・内容・支払者名・支払い方法、編集リンク（`day-expense-edit` → `/expenses/{id}/edit`）、削除ボタン（`day-expense-delete`、確認のうえ `DELETE`、404なら既に削除された旨を表示）、支出がない場合の表示（`day-empty`「支出はありません」）、追加リンク（`day-add` → `/expenses/new?date={date}`）、戻るリンク（`day-back` → `/months/{その日の年月}`）を表示する。削除後は月のSWRキャッシュも無効化する（FR-019, FR-021）
- [ ] T044 [US3] `app/(dashboard)/days/[date]/page.tsx` を作成する: `date` を検証（不正なら `notFound()`）、`requireBudgetedGroup()`、`DayExpenseList` を表示する（T039, T043に依存）
- [ ] T045 [US3] `components/month-calendar.tsx` の各日付マスを `/days/{YYYY-MM-DD}` へのリンクにし（FR-016）、「＋」リンク（`calendar-add` → `/expenses/new?date={今日}`）を追加する（FR-018）
- [ ] T046 [US3] T036・T037 と既存のテストがすべて成功することを確認する

**Checkpoint**: 新画面だけで、支出の閲覧・追加・編集・削除が完結する

---

## Phase 6: User Story 4 - メニューからのグループ操作とログアウト (Priority: P3)

**Goal**: カレンダー上部の3点リーダーメニュー、招待リンク画面、グループ作成・切り替え画面を作り、
複数グループへの所属と選択中グループの記憶を実現する（FR-001の(1), FR-023〜FR-029）

**Independent Test**: メニューから招待リンク発行・グループ作成・切り替え・ログアウトができ、再ログイン
時に最後に選んだグループが開くことを確認する（quickstart.md シナリオ6）

### Tests for User Story 4（実装前に作成し、失敗することを確認する）

- [ ] T047 [P] [US4] `tests/unit/selected-group.test.ts` に追記する。`selectGroup(userId, groupId)` が、メンバーなら `selectedGroupId` を更新し、非メンバーなら例外を投げて更新しないこと。`joinGroupByToken` で2つ目のグループに参加すると、1つ目の所属が残ったまま `selectedGroupId` が2つ目になること
- [ ] T048 [P] [US4] `tests/e2e/menu.spec.ts` を作成する（US4 AC1〜3）: カレンダーの `header-menu-button` を押すと `header-menu-invite` `header-menu-create-group` `header-menu-switch-group` `header-menu-logout` が表示されること → 招待リンク画面で `invite-generate` を押すと `invite-url` にURLが表示されること → メニューからログアウトすると `/login` に移り、`/months/{今月}` を開いても `/login` に戻されること
- [ ] T049 [P] [US4] `tests/e2e/multi-group.spec.ts` を作成する（quickstart.md シナリオ6、US4 AC4〜8）: 未所属のユーザーはログイン後に `/groups/new` に移ること → メニューからグループを作成すると新しいグループの予算画面（初回モード）に移り、保存後のカレンダーに新しいグループ名が表示され、元のグループの支出が見えないこと → `/groups` で元のグループを選ぶと元のグループのカレンダーに戻ること → ログアウト・再ログインで元のグループが開くこと → 別ユーザーのグループの招待リンクから参加すると、そのグループが選択中になり、`/groups` に両方のグループが並ぶこと

### Implementation for User Story 4

- [ ] T050 [US4] `lib/groups.ts` に `selectGroup(userId, groupId)` を実装する（非メンバーなら例外。成功時 `logger.info("group.select", { userId, groupId })`）（T047を通す）
- [ ] T051 [US4] `app/api/me/selected-group/route.ts` に PUT を実装する: 未認証401、`groupId` 欠落400、非メンバー403、成功時 `{ groupId }`（contracts/api.md）（T050に依存）
- [ ] T052 [P] [US4] `components/invite-link.tsx` を作成し、`components/dashboard.tsx` の `InviteSection`（発行・コピー、`invite-generate` / `invite-url`）と同じ機能を持たせる。`app/(dashboard)/invite-link/page.tsx` を作成し、`requireActiveGroup()` のうえで `InviteLink` と戻るリンク（→ カレンダー）を表示する（FR-024）
- [ ] T053 [P] [US4] `components/header-menu.tsx` を作成する（クライアントコンポーネント）: 3点リーダーのボタン（`header-menu-button`）で開閉し、「招待リンク」（`header-menu-invite` → `/invite-link`）、「グループ作成」（`header-menu-create-group` → `/groups/new`）、「グループ切り替え」（`header-menu-switch-group` → `/groups`）、「ログアウト」（`header-menu-logout`、`signOut({ redirectTo: "/login" })` を呼ぶServer Actionのフォーム）を表示する（FR-023, FR-025。research.md #9）
- [ ] T054 [US4] `components/month-calendar.tsx` の上部に `HeaderMenu` を配置する（T053に依存）
- [ ] T055 [US4] `app/(dashboard)/groups/new/page.tsx` を作成し、`components/create-group-form.tsx` を表示する。作成後の遷移を `router.refresh()` から `router.push("/")` に変える（振り分けにより新グループの予算画面へ）。所属グループがある場合のみ戻るリンクを表示する（FR-026）
- [ ] T056 [US4] `app/(dashboard)/groups/page.tsx` と `components/group-switcher.tsx` を作成する: 所属グループの一覧（`group-switch-item`、選択中に印）を表示し、選ぶと `PUT /api/me/selected-group` を呼んで `router.push("/")` する。戻るリンクを付ける（FR-027）（T051に依存）
- [ ] T057 [US4] `app/(dashboard)/page.tsx` の振り分けを更新し、未所属なら `/groups/new` へ `redirect()` する（FR-001の(1)）。`tests/e2e/helpers.ts` のグループ作成手順が新しい画面でも動くことを確認する（T055に依存）
- [ ] T058 [US4] T047〜T049 と既存のテストがすべて成功することを確認する

**Checkpoint**: 4つのユーザーストーリーの新画面がすべてそろう

---

## Phase 7: 切り替えと仕上げ（Polish & Cross-Cutting Concerns）

**Purpose**: `/` の行き先をカレンダーに切り替え、001の旧画面と不要になったAPI・テストを削除し、
全体を検証する

- [ ] T059 `tests/e2e/expense-sharing.spec.ts` を書き換える（quickstart.md シナリオ5、US1 AC6、US2 AC3）: ユーザーAがメニューから招待リンクを発行し、ユーザーBが参加すると予算画面を経ずにカレンダーに移ること → 両者がカレンダーを開いた状態で、Aの支出の追加・編集・削除と予算変更が、Bのカレンダーの日別合計と残額に操作なしで数秒以内に反映されること。あわせて `tests/e2e/first-run.spec.ts` の再ログイン後の確認を「`/months/{今月}` のカレンダーが表示される」に強める。この時点では旧画面が残っているため失敗することを確認する
- [ ] T060 `app/(dashboard)/page.tsx` を振り分け専用にし、予算設定済みなら `/months/{今月}` へ `redirect()` する（FR-001の(3)）。`components/dashboard.tsx` を削除する
- [ ] T061 [P] 不要になったAPIを削除する: `app/api/groups/[groupId]/budget/route.ts` を削除し、`app/api/groups/[groupId]/expenses/route.ts` の GET（T015の互換対応）を削除する（contracts/api.md「削除」）
- [ ] T062 [P] `app/(dashboard)/layout.tsx` からログアウトのヘッダーを削除する（ログアウトはメニューへ移設済み）。認証ガードは残す
- [ ] T063 [P] 旧画面向けのE2Eを整理する: `tests/e2e/budget-display.spec.ts`（`budget-carryover.spec.ts` へ移行済み）、`tests/e2e/payment-method.spec.ts`（`day-detail.spec.ts` へ移行済み）、`tests/e2e/logout.spec.ts`（`menu.spec.ts` へ移行済み）を削除する。削除前に、各ファイルが検証していた観点が移行先のテストに含まれていることを確認する
- [ ] T064 `grep` で `monthlyBudget`・`getBudgetSummary`・`budget-input`・`expense-list`・`InviteSection` など削除したものへの参照が残っていないことを確認する
- [ ] T065 001の状態（予算設定済みグループと支出あり）のDBのコピーに対してマイグレーションを適用し、quickstart.md シナリオ8を確認する
- [ ] T066 quickstart.md のシナリオ1〜7を通しで確認し、食い違いがあれば修正する
- [ ] T067 [P] `README.md` の機能説明と `docs/deployment.md` の「更新の反映」に、本機能のマイグレーション（データ移行を含む）の適用前に `prisma/dev.db` をバックアップする手順を追記する
- [ ] T068 `npm run test`・`npm run test:e2e`・`npm run lint` がすべて成功することを確認する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし
- **Foundational (Phase 2)**: Setup完了後。**全ユーザーストーリーをブロックする**
- **US1 (Phase 3)**: Foundational完了後
- **US2 (Phase 4)**: US1完了後（予算保存後の遷移先としてカレンダー画面が必要なため）
- **US3 (Phase 5)**: US1完了後（カレンダーの日付マスから遷移するため）。US2とは独立
- **US4 (Phase 6)**: US1完了後（メニューをカレンダー上部に置くため）。US2・US3とは独立
- **切り替えと仕上げ (Phase 7)**: US1〜US4すべての完了後（旧画面の機能をすべて新画面が引き継いでから削除する）

### User Story Dependencies

- **US1 (P1)**: Foundationalのみに依存。予算の設定は旧画面・APIで行えるので単独で検証できる
- **US2 (P1)**: US1のカレンダー画面に依存（保存後の遷移先・年月のリンク元）
- **US3 (P2)**: US1のカレンダー画面に依存
- **US4 (P3)**: US1のカレンダー画面に依存

### Within Each User Story

- テストを先に書き、実装前に失敗することを確認する（憲法II）
- ロジック（`lib/`）→ API → 画面部品 → ページ → 既存画面からのリンク の順
- 各フェーズの最後に、そのフェーズのテストと既存のテストがすべて成功することを確認する

### Parallel Opportunities

- Phase 2 のテスト T003〜T007 は並列で作成できる。実装の T011 は T010（`lib/date.ts`）の完了後に行う
- Phase 3 の T018〜T020、T021・T022 は並列
- US1完了後は、US2・US3・US4 を並行して進められる（`components/month-calendar.tsx` への追加（T032, T045, T054）だけは同じファイルなので順に行う）
- Phase 7 の T061〜T063 は並列

---

## Parallel Example: User Story 1

```bash
# テストを並列で作成する:
Task: "tests/unit/calendar-grid.test.ts を作成"
Task: "tests/unit/format.test.ts を作成"
Task: "tests/e2e/calendar.spec.ts を作成"

# ロジックを並列で実装する:
Task: "lib/calendar.ts に buildMonthGrid を実装"
Task: "lib/format.ts に formatDayAmount / formatYen を実装"
```

---

## Implementation Strategy

### MVP First（US1 + US2）

1. Phase 1・2 でデータを移行する（この時点で旧画面は動き続ける）
2. Phase 3（US1）でカレンダー画面を作り、URLで直接開いて検証する
3. Phase 4（US2）で予算画面と初回の流れを作る
4. ここまでで「カレンダーで月の残額と日別の支出を見る」「月ごとに予算を変える」が動く。支出の追加は、
   まだ旧画面で行う

### Incremental Delivery

1. Setup + Foundational → 新データ構造へ移行（見た目は001のまま）
2. US1 → カレンダーが見られる
3. US2 → 初回の予算決定と月ごとの予算・繰越
4. US3 → 支出の閲覧・入力が新画面で完結
5. US4 → メニュー・招待・複数グループ
6. Phase 7 → `/` をカレンダーに切り替え、旧画面を削除

各段階で既存のテストを通し、アプリが使える状態を保つ。

---

## Notes

- [P] タスク = 別ファイルで、未完了のタスクに依存しない
- 各タスクの完了は、対応するテストの成功で判断する（憲法II）
- 論理的なタスクの区切りごとにコミットする
- WSLを呼び出せない環境では、`npx prisma migrate dev` や `npm run test:e2e` などはユーザーにWSLの
  ターミナルで実行してもらう（`! <コマンド>`）
