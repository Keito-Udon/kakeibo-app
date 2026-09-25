# kakeibo-app

半同棲・新婚カップル(2人)が、共有財布の支出を記録・共有できるWebアプリ。spec-kitのワークフロー
（`.specify/`）を使って仕様駆動で開発している。詳細は以下を参照:

- 企画検討メモ: [`docs/project-plan.md`](docs/project-plan.md)
- 機能仕様・実装プラン:
  - 001 共有家計簿MVP: [`spec.md`](specs/001-shared-budget/spec.md) / [`plan.md`](specs/001-shared-budget/plan.md)
  - 002 カレンダー表示と月別予算: [`spec.md`](specs/002-calendar-monthly-budget/spec.md) / [`plan.md`](specs/002-calendar-monthly-budget/plan.md)
- デプロイ手順: [`docs/deployment.md`](docs/deployment.md)

## 主な機能

画面は「1画面1機能」で分けている（画面ごとの役割は
[`specs/002-calendar-monthly-budget/contracts/screens.md`](specs/002-calendar-monthly-budget/contracts/screens.md)）。

- **カレンダー**（ログイン後の主画面）: 月の残額と、日ごとの支出合計を表示。前後の月に移動できる。
  カレンダーの左には、その月にメンバーごとに払った金額（支払者で集計）と、全体に占める割合を表示する
  （[`specs/003-member-spending`](specs/003-member-spending/spec.md)）
- **月別予算**: 年月をタップして月ごとに設定額を変更。使い切れなかった分は翌月に繰り越し、超過分は翌月から差し引く。グループで最初の1回だけ、ログイン後に予算決定画面が出る
- **日別詳細・支出の追加／編集**: 日付をタップしてその日の支出を確認。タイトル（必須・50文字まで）、
  メモ（任意・改行可・200文字まで）、支出日・支払者・支払い方法（現金／モバイル決済）を記録。日別詳細では
  タイトルの下にメモの全文を表示する（[`specs/004-expense-title-memo`](specs/004-expense-title-memo/spec.md)）
- **メニュー（…）**: 招待リンクの発行、グループ作成、グループ切り替え（複数グループに所属可）、ログアウト
- 同じグループのメンバーの変更は、数秒以内に自動で画面に反映される

## セットアップ

```bash
npm install
cp .env.example .env
# .env の AUTH_SECRET を生成して設定する
openssl rand -base64 32
npx prisma migrate dev --name init
```

## 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開く。

## テスト

```bash
# ユニットテスト（Vitest）
npm run test

# E2Eテスト（Playwright。初回は `npx playwright install chromium` が必要）
npm run test:e2e
```

## Lint

```bash
npm run lint
```

## 技術スタック

### アプリケーション本体

| 分類 | 採用技術 |
|---|---|
| フロントエンド/バックエンド | [Next.js](https://nextjs.org/)（App Router, TypeScript）によるフルスタック単一プロジェクト |
| DB | SQLite |
| ORM | [Prisma](https://www.prisma.io/) 6.19.3（7系はdriver adapter必須化で複雑になるため6系に固定） |
| 認証 | [Auth.js](https://authjs.dev/)（`next-auth` v5, Credentials Provider）。パスワードは[bcryptjs](https://github.com/dcodeIO/bcrypt.js)でハッシュ化 |
| データ取得・同期 | [SWR](https://swr.vercel.app/)（ショートポーリングによる数秒間隔の準リアルタイム同期） |
| バリデーション | [Zod](https://zod.dev/) |
| UI | Tailwind CSS + 自作の共通コンポーネント（`components/ui/`）、アイコンは[lucide-react](https://lucide.dev/) |

### テスト・Lint

| 分類 | 採用技術 |
|---|---|
| ユニットテスト | [Vitest](https://vitest.dev/) |
| E2Eテスト | [Playwright](https://playwright.dev/) |
| Lint | ESLint（`eslint-config-next`） |

### デプロイ・運用

| 分類 | 採用技術 |
|---|---|
| ホスティング | 自前サーバー（常時稼働のLinuxマシン）上で`next start`を常駐実行。SQLiteのファイル永続化を前提とするため、Vercel等のサーバーレス環境は不採用 |
| プロセス管理 | [pm2](https://pm2.keymetrics.io/)（クラッシュ時の自動再起動・OS起動時の自動起動） |
| 外部公開 | [Tailscale Funnel](https://tailscale.com/kb/1223/funnel)（独自ドメイン・ポート開放なしで、大学ネットワーク等のNAT/FW配下からもHTTPS公開できる） |

各技術の選定理由は [`specs/001-shared-budget/research.md`](specs/001-shared-budget/research.md)、
デプロイ手順は [`docs/deployment.md`](docs/deployment.md) を参照。
