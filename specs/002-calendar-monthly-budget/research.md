# Research: カレンダー表示と月別予算（Calendar & Monthly Budget）

Phase 0の技術調査。001で確定した技術スタック（Next.js 16.3.5 App Router／Prisma 6.19.3／SQLite／
Auth.js v5／SWR／Zod、`specs/001-shared-budget/research.md`）は変更しない。本機能で新たに決める
必要があるのは、画面の分け方（ルーティング）、選択中グループの持ち方、日付・月の扱い、繰越計算、
既存データの移行である。新規の依存パッケージは追加しない。

## 1. 画面とURLの対応（FR-004: 1画面1機能）

**Decision**: 1画面を1つのURL（App Routerの1つの `page.tsx`）に対応させる。選択中のグループは
URLに含めず、サーバー側でユーザーの `selectedGroupId` から解決する（#2）。

| 画面 | URL |
|---|---|
| 振り分け（画面を持たない） | `/` |
| グループ作成 | `/groups/new` |
| グループ切り替え | `/groups` |
| 予算決定・変更 | `/months/{YYYY-MM}/budget` |
| カレンダー | `/months/{YYYY-MM}` |
| 日別詳細 | `/days/{YYYY-MM-DD}` |
| 支出追加 | `/expenses/new?date={YYYY-MM-DD}` |
| 支出編集 | `/expenses/{expenseId}/edit` |
| 招待リンク | `/invite-link` |
| 招待リンクからの参加（001から維持） | `/invite/{token}` |

**Rationale**:
- 年月・日付をURLに持たせると、前月・翌月移動（FR-015）や日付タップ（FR-016）が単なるリンクになり、
  ブラウザの「戻る」もそのまま使える（Assumptions: 戻る操作）
- ログイン後の振り分け（FR-001）は `/` のServer Componentで判定して `redirect()` する。ログインの
  Server Actionは既に `redirectTo: "/"` なので変更不要
- 初回の予算決定（FR-002）と予算変更（FR-006）は同じ画面を使う。役割は「その月の設定額を決める」の
  1つで同じであり、別画面にする理由がない（憲法I）
- 招待リンク発行画面を `/invite` ではなく `/invite-link` にするのは、既存の参加画面 `/invite/{token}`
  と紛らわしくしないため

**Alternatives considered**:
- URLにグループIDを含める（`/groups/{groupId}/months/...`） — FR-028で「選択中のグループ」をDBに
  記憶する必要があるため、URLとDBの二重管理になる。2人利用が主のため、URL共有でグループを指定する
  需要もない
- 1ページ内のクライアント状態（モーダル・タブ）で画面を切り替える — 「1画面1機能」をURL単位で
  検証できなくなり、戻る操作も自前実装になるため不採用
- Parallel Routes / Intercepting Routes（モーダル表示） — 本機能の要件に対して過剰（憲法I）

## 2. 選択中グループの持ち方（FR-026〜FR-029）

**Decision**: `User` に `selectedGroupId`（nullable）を追加してDBに保存する。

**Rationale**:
- FR-028「次回ログイン時もそのグループを選択中にする」を、端末をまたいでも満たせる
- Cookieに保存する案は、別の端末でログインしたときに引き継がれない
- 所属が外れた等で `selectedGroupId` が無効になった場合は、所属グループのうち最初に参加したものを
  選び直す（サーバー側の解決処理で吸収する）

**Alternatives considered**:
- Cookie — 端末ごとの記憶になり、FR-028を満たさない
- JWTセッションに含める — 切り替えのたびにセッションを再発行する必要があり複雑

## 3. 画面の保護（FR-001, FR-003）とProxyを使わない理由

**Decision**: ログイン必須の判定は既存の `app/(dashboard)/layout.tsx` のまま。グループ・予算の
有無による振り分けは、各ページ冒頭で呼ぶ共通関数（`lib/active-group.ts`）で行う。
- `requireActiveGroup()`: 未所属なら `/groups/new` へ
- `requireBudgetedGroup()`: 上記に加え、予算が一度も設定されていなければ当月の予算画面へ（FR-003）

**Rationale**:
- Next.js 16のドキュメント（`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`）は、
  Proxy（旧Middleware）を低速なデータ取得や本格的な認可に使わないよう明記している。グループ・予算の
  有無の判定にはDBアクセスが必要なので、Proxyではなくページ側で行う
- Layoutは子ページのパス（予算画面かどうか）を知らないため、振り分けはページごとに呼ぶ
- APIルートは001と同じく、各ハンドラで `auth()` と `isGroupMember()` を検証する（FR-007維持）

## 4. 日付と月の扱い（Assumptions: 日本時間）

**Decision**:
- 支出日は `YYYY-MM-DD` の文字列として保存する（`ExpenseRecord.spentOn`）
- 年月は `YYYY-MM` の文字列として扱う（`MonthlyBudget.yearMonth`）
- 「今日」「今月」は `Intl.DateTimeFormat` に `timeZone: "Asia/Tokyo"` を指定して求める
  （`lib/date.ts`）。日付ライブラリは追加しない

**Rationale**:
- 001の `lib/budget.ts` はサーバーのローカルタイムゾーンで月初を求めていた。本番の研究室マシンが
  UTC設定だと、日本時間の0〜9時の支出が前日扱いになる。支出日を日付文字列で持てばタイムゾーンの
  ずれが入り込まない
- 文字列は辞書順で日付順に並ぶため、`spentOn >= "2026-09-01" AND spentOn <= "2026-09-30"` のような
  範囲検索や、`startsWith("2026-09")` での月の絞り込みがそのまま使える
- カレンダーのマス配置（曜日・月の日数）は、日付文字列から `Date.UTC` を使って計算すれば
  タイムゾーンの影響を受けない

**Alternatives considered**:
- `DateTime` 型で保存 — 日付のみの値に時刻とタイムゾーンが付き、上記のずれの原因になる
- date-fns / dayjs の導入 — 必要な処理（今日の日付、月の日数、曜日、前後の月）は数関数で済むため
  不要（憲法I）

## 5. 繰越計算（FR-010〜FR-012）

**Decision**: 繰越額・残額はDBに保存せず、表示のたびに計算する。計算は純粋関数
`computeMonthSummary(budgets, monthlyTotals, targetYearMonth)` に分離し、DBから読む部分と分ける。

計算手順:
1. グループの `MonthlyBudget` を年月順に並べ、最初の年月を「予算開始月」とする（FR-011）
2. 表示月が予算開始月より前なら、予算なし（`null`）を返す（Edge Cases）
3. 予算開始月から表示月まで1か月ずつ進めながら、
   - 設定額 ＝ その月の `MonthlyBudget`、なければ直前の月の設定額（FR-008）
   - 予算 ＝ 設定額 ＋ 前月からの繰越額（予算開始月は繰越0円）
   - 残額 ＝ 予算 − その月の支出合計
   - 翌月への繰越額 ＝ 残額（マイナスもそのまま、FR-010）

**Rationale**:
- 保存しないので、過去の月の支出や設定額を変えても以降の月が自動で正しくなる（FR-012）。
  保存方式だと、変更のたびに以降の全月を更新する処理が必要で、ずれ（SC-004違反）の原因になる
- 2人・月数十件の規模では、予算開始月から数年分を毎回計算しても負荷は無視できる
- 純粋関数に分けることで、DBなしのユニットテストで繰越の各ケース（余り・超過・連続超過・
  設定額の引き継ぎ・予算開始月より前）を網羅できる（憲法II）
- 月ごとの支出合計は、対象期間の支出を `spentOn` で日別に集計（Prismaの `groupBy`）してから
  アプリ側で月別に足し合わせる。同じ日別集計はカレンダーの日付マス表示（FR-014）にも使う

**Alternatives considered**:
- 月次の締め処理で繰越額を保存 — 過去の修正への追随が必要になり複雑。締めのタイミング（誰も
  アクセスしない月）の扱いも必要になる
- SQLの再帰CTEで計算 — Prismaの型安全性を失い、テストもしにくい

## 6. 既存データの移行（Edge Cases: 001の既存データ）

**Decision**: Prismaのマイグレーション1本で、スキーマ変更とデータ移行をまとめて行う。
`prisma migrate dev --create-only` で生成したSQLに、データ移行のSQLを追記する。

- `ExpenseRecord.spentOn`: 既存行は `createdAt` を日本時間に変換した日付で埋める
- `MonthlyBudget`: `Group.monthlyBudget` が設定済みのグループについて、マイグレーション実行時点の
  日本時間の年月で1行作成する。その後 `Group.monthlyBudget` 列を削除する
- `User.selectedGroupId`: 所属グループのうち最初に参加したもの（`joinedAt` が最も古いもの）で埋める

**Rationale**:
- 本番（研究室マシン）には `npx prisma migrate deploy` で同じ移行が適用され、手作業が要らない
  （`docs/deployment.md` の更新手順をそのまま使える）
- SQLiteでのPrismaの `DateTime` 列の保存形式（数値のミリ秒か文字列か）によって変換式が変わるため、
  実装時に既存の `dev.db` で保存形式を確認し、マイグレーションSQLのテスト（移行前後のデータ比較）を
  行ってから確定する

**確認結果（T002, 2026-09-23）**: 既存の `prisma/dev.db` で `SELECT typeof(createdAt)` を確認したところ
`integer`（UNIXエポックからのミリ秒）だった。したがって、日本時間の日付への変換式は
`date(createdAt / 1000, 'unixepoch', '+9 hours')`、実行時点の日本時間の年月は
`strftime('%Y-%m', 'now', '+9 hours')` とする。実データ（2026-09-18T06:28:56Z）で `2026-09-18` に
変換されることを確認済み。

**Alternatives considered**:
- 別スクリプトでのデータ移行 — 本番で実行を忘れるリスクがある
- `Group.monthlyBudget` を残して併用 — 予算の置き場所が2つになり、どちらが正か曖昧になる（憲法III）

## 7. カレンダーの日付マスの金額表示（Edge Cases: 金額が収まらない）

**Decision**: 1万円未満は `1,500` のようにカンマ区切りで表示し、1万円以上は `1.2万` のように
万単位（小数第1位、四捨五入）で表示する。日別詳細画面では常に正確な金額を表示する。
カレンダーは外部ライブラリを使わず、7列のグリッドで自作する（日曜始まり）。

**Rationale**: スマホ幅で1マスに収まる桁数は5文字程度。日常の支出は1日1万円未満がほとんどなので、
多くの日は正確な金額がそのまま見える。

## 8. 自動反映（FR-009, FR-021）

**Decision**: 001と同じくSWRの `refreshInterval`（3秒）によるポーリングを、カレンダー画面と日別詳細
画面で使う。予算・支出の保存後は、元の画面に戻る前にSWRのキャッシュを無効化（`mutate`）して、
戻った直後から新しい値を表示する。

**Rationale**: 001の research.md #1 の判断をそのまま適用する。入力画面（予算・支出の追加/編集）は
表示中のデータが自分の入力だけなので、ポーリングしない。

## 9. 3点リーダーメニュー（FR-023）

**Decision**: メニューは画面ではなく、カレンダー画面上部の開閉式のメニュー（クライアント
コンポーネント）とする。各項目は別画面へのリンク（招待リンク・グループ作成・グループ切り替え）、
またはServer Actionのフォーム（ログアウト、001の実装を移設）とする。

**Rationale**: メニュー自体は「移動先を選ぶ」だけなので、独立した画面にしなくても1画面1機能に
反しない。UIライブラリは追加しない（憲法I）。

## まとめ：解決されたTechnical Context

| 項目 | 決定内容 |
|---|---|
| 新規依存 | なし（日付計算は `Intl` と `Date.UTC`、カレンダーは自作） |
| ルーティング | 1画面＝1 `page.tsx`。年月・日付はURLに持ち、グループはDBの選択中グループから解決 |
| 画面の保護 | 認証はlayout（既存）、グループ・予算の有無はページ冒頭の共通関数。Proxyは使わない |
| 日付 | `YYYY-MM-DD` / `YYYY-MM` の文字列、日本時間基準 |
| 繰越 | 保存せず毎回計算。純粋関数に分離してユニットテスト |
| 移行 | Prismaマイグレーション1本にデータ移行SQLを含める |
| 自動反映 | SWR 3秒ポーリング（カレンダー・日別詳細） |
