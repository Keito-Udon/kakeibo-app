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

- Next.js（App Router, TypeScript）フルスタック
- Prisma 6.19.3 + SQLite
- Auth.js（next-auth v5, Credentials Provider）
- SWR（ショートポーリングによる準リアルタイム同期）
- Vitest（ユニットテスト） / Playwright（E2Eテスト）

選定理由の詳細は [`specs/001-shared-budget/research.md`](specs/001-shared-budget/research.md) を参照。
