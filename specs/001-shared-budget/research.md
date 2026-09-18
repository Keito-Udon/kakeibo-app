# Research: 共有家計簿（Shared Budget）

Phase 0の技術調査。憲法（`.specify/memory/constitution.md`）で確定済みの制約（Next.jsフルスタック／
Prisma／SQLite／PWA配布）を前提に、spec.md の要件（特に FR-013 のリアルタイム同期、FR-014 の招待
リンク方式）を満たすための具体的な技術選定をまとめる。

## 1. リアルタイム同期の実現方法（FR-013）

**Decision**: SWR（または同等のデータフェッチライブラリ）の `refetchInterval` によるショートポーリング
（3〜5秒間隔）を採用する。WebSocket / Server-Sent Events は使わない。

**Rationale**:
- 対象ユーザーは常時2〜数名の小規模グループであり、ポーリングによるサーバー負荷は無視できる
- WebSocketは別途コネクション管理・サーバーのステートフル化が必要になり、Next.jsのサーバーレス的な
  API Routes構成と相性が悪く、単一プロセス構成というシンプルさ（憲法I）を崩す
- 「数秒以内の反映」というFR-013の要件は、3〜5秒間隔のポーリングで実務上満たせる
- 既存プロジェクト（rakutabi_intern）でも `useSWR` を使ったデータフェッチパターンの実績があり、
  学習コストがかからない

**Alternatives considered**:
- WebSocket（例: Socket.IO） — リアルタイム性は高いが、単一プロセスのシンプルさを崩し、
  個人開発規模には過剰
- Server-Sent Events — WebSocketより軽量だが、Next.jsのAPI Routesでの長時間接続保持に工夫が要り、
  ポーリングより実装・運用コストが高い
- 手動リロードのみ — FR-013（ユーザーとの確認で「数秒以内の自動反映」と決定済み）を満たさないため不採用

## 2. 認証方式

**Decision**: Auth.js（NextAuth.js）の Credentials Provider を使い、メールアドレス＋パスワードによる
セッションベース認証を実装する。パスワードは bcrypt でハッシュ化して保存する。

**Rationale**:
- Next.js App Router との統合が標準的で、フルスタック構成のまま完結する（別サービス不要）
- 憲法の「追加の制約」で決まっている「メールアドレス＋パスワードの一般的な形式」に合致
- セッション管理・Cookie周りを自前実装せずに済み、YAGNIに合致

**Alternatives considered**:
- 自前のJWT実装 — セキュリティ上の落とし穴（トークン失効、リフレッシュ等）を自分で作り込む必要があり、
  個人開発では過剰なリスク
- OAuth（Googleログイン等） — ユーザー側の要望になく、外部プロバイダ依存が増えるだけなので不採用

## 3. 招待リンクの実装方式（FR-014）

**Decision**: グループごとに一意な招待トークン（推測困難なランダム文字列、例: UUID v4 または
crypto.randomUUID()）を発行し、`/invite/[token]` のようなURLでアクセスするとログイン後に自動でグループへ
参加できる仕組みとする。トークンはDBに保存し、招待発行者が再発行（失効）できるようにする。

**Rationale**:
- 実装がシンプルで、憲法のYAGNIに合致（メール送信基盤が不要）
- ユーザーとの確認で「招待リンクを知っていれば参加できる形式」と決定済み（Q3: Option A）
- 再発行によるトークン失効機能を持たせることで、エッジケース（リンク流出）への最低限の対策とする

**Alternatives considered**:
- メールでの招待送信 — セキュアだがメール送信基盤（SMTP/SESなど）が必要になり、個人開発の練習用
  スコープには過剰（ユーザーとの確認でも不採用と決定済み）

## 4. ORM・DBアクセス

**Decision**: Prisma（憲法で確定済み）。SQLiteファイルは `prisma/dev.db` に配置し、`.gitignore` で
除外する。

**Rationale**: 憲法の「追加の制約」で確定済み。型安全なクエリ・マイグレーション管理が単一ツールで
完結する。

## 5. テスト戦略

**Decision**: ユニット/API Routeレベルのテストに **Vitest**、画面を通した結合テストに **Playwright**
を使う。

**Rationale**:
- Playwrightは既存プロジェクト（playwright-lab）での運用実績があり、テストコードの書き方・レポート
  形式に一貫性を持たせられる
- Vitestは Next.js / TypeScript との親和性が高く、API Route単体のロジック（例: 残額計算、支出額
  バリデーション）を高速に検証できる
- 憲法IIのテストファースト原則に従い、`/speckit-tasks` で分解する各タスクは実装前にこれらのテストを
  用意する

**Alternatives considered**:
- Jest — Vitestの方がNext.js/ESM環境でのセットアップが軽量なため不採用

## 6. デプロイ・実行環境

**Decision**: ローカル開発環境（WSL2）での `npm run dev` 実行を基本とし、本番デプロイ先は本フェーズの
スコープ外とする（practice目的のため、PWAとしてローカル/同一ネットワーク内での利用を想定）。

**Rationale**: spec.mdのAssumptionsにデプロイ要件が明記されておらず、憲法のYAGNI原則から不要な
決定を先送りする。デプロイが必要になった時点で別途プランニングする。

## まとめ：解決されたTechnical Context

| 項目 | 決定内容 |
|---|---|
| Language/Version | TypeScript, Node.js 22+ |
| Primary Dependencies | Next.js (App Router), Prisma, Auth.js (Credentials Provider), SWR, Zod |
| Storage | SQLite（`prisma/dev.db`）, Prisma ORM |
| Testing | Vitest（ユニット/API）, Playwright（E2E） |
| Target Platform | Webブラウザ（PWA、ホーム画面追加でiOS/Android対応） |
| Project Type | web-service（Next.jsフルスタック単一プロジェクト） |
| Performance Goals | 2〜数名規模のグループを想定。ポーリング間隔3〜5秒で「数秒以内の反映」を実現 |
| Constraints | SQLiteの単一ライター特性を許容できる小規模同時アクセス（数名規模） |
| Scale/Scope | MVPは1グループ・2ユーザーを主眼とするが、グループ人数の上限はDB設計上設けない |
