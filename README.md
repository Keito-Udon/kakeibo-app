# kakeibo-app

半同棲・新婚カップル(2人)が、共有財布の支出を記録・共有できるWebアプリ。spec-kitのワークフロー
（`.specify/`）を使って仕様駆動で開発している。詳細は以下を参照:

- 企画検討メモ: [`docs/project-plan.md`](docs/project-plan.md)
- 機能仕様: [`specs/001-shared-budget/spec.md`](specs/001-shared-budget/spec.md)
- 実装プラン: [`specs/001-shared-budget/plan.md`](specs/001-shared-budget/plan.md)
- デプロイ手順: [`docs/deployment.md`](docs/deployment.md)

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
