# デプロイ手順（研究室の常時稼働機 + Tailscale Funnel）

研究室のSSHアクセス可能なLinuxマシンに常駐させ、Tailscale Funnelでモバイルデータ通信からも
アクセスできるようにする手順。大学ネットワークは通常、外部からの新規接続を受け付けない
（ポート開放・固定グローバルIPが使えない）ため、アウトバウンド接続のみで完結するTailscale
Funnelを使う。独自ドメインは不要。

## 前提

- 研究室のLinuxマシンにSSHで入れること
- そのマシンが電源・ネットワークともに常時オンであること
- Tailscaleアカウント（個人利用は無料。GitHub/Googleアカウント等でサインアップ可）

**学外からのSSHについて**: 大学ネットワークの制約で、学外から研究室マシンにSSHするには大学VPNへの
接続が必要な場合がある（セットアップ・メンテナンス作業時のみの話）。これは手順1〜6のSSH作業にのみ
関係する。手順7以降、スマホから実際にアプリへアクセスする際は、Tailscale Funnelが研究室マシン側
から発信する形で経路を作るため、大学ネットワークや大学VPNを経由しない。スマホは通常のモバイル
データ通信のまま、Funnelが発行したURLに直接アクセスできる。

## 1. アプリの配置

```bash
ssh <研究室マシン>

# Node.js 22+ を用意（nvm推奨。WSL側と同じ手順）
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 22

git clone git@github.com:Keito-Udon/kakeibo-app.git
cd kakeibo-app
npm ci
```

## 2. 本番用の環境変数

開発用の`.env`とは別に、本番用の値を設定する。`AUTH_SECRET`は開発用を使い回さず、
新しく生成すること。`NEXTAUTH_URL`は手順4でTailscale Funnelのアドレスが決まってから設定する
（一旦は仮の値でよい）。

```bash
cp .env.example .env
sed -i "s|AUTH_SECRET=\"\"|AUTH_SECRET=\"$(openssl rand -base64 32)\"|" .env
```

## 3. ビルド・マイグレーション・常駐起動

```bash
npx prisma migrate deploy
npm run build

# pm2で常駐させる（プロセスが落ちても自動再起動、再起動後も自動起動）
npm install -g pm2
pm2 start npm --name kakeibo-app -- start
pm2 save
pm2 startup   # 表示されるコマンドをそのまま実行するとOS起動時に自動起動する
```

動作確認: `curl http://localhost:3000/login` が200を返せばOK。

## 4. Tailscaleのセットアップ

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

表示されるURLをブラウザで開いてログイン（Tailscaleアカウントに、この端末を接続する）。
接続後、以下でこのマシンのTailscale上の名前を確認する。

```bash
tailscale status
# 例: 100.x.x.x   labserver   ... のように表示される "labserver" 部分がマシン名
```

## 5. Funnelを有効化して公開

```bash
tailscale funnel --bg 3000
```

成功すると `https://labserver.<あなたのtailnet名>.ts.net` のようなURLが表示される
（`tailscale funnel status` でいつでも確認できる）。これが固定の公開URL。

## 6. NEXTAUTH_URLを本番URLに合わせて再起動

```bash
# .env のNEXTAUTH_URLを手順5で確認したURLに書き換える
sed -i 's|NEXTAUTH_URL=.*|NEXTAUTH_URL="https://labserver.<あなたのtailnet名>.ts.net"|' .env

pm2 restart kakeibo-app
```

## 7. スマホから確認

モバイルデータ通信に切り替えた状態で、手順5のURLをブラウザで開く。`/signup`からアカウントを
作成できれば成功。

## 運用メモ

- **再起動後**: `pm2 startup`を設定していればアプリは自動起動するが、`tailscale funnel --bg 3000`
  は起動していない場合、電源断後に手動で再実行が必要になることがある（`systemctl status
  tailscaled`で確認）
- **DBのバックアップ**: `prisma/dev.db`が唯一のデータの実体。定期的に別の場所へコピーしておくと安心
  （例: `cp prisma/dev.db ~/backups/dev-$(date +%F).db` をcronで日次実行）
- **更新の反映**: ローカル（WSL）で開発・pushしたら、研究室マシン側で
  `git pull && npm ci && npx prisma migrate deploy && npm run build && pm2 restart kakeibo-app`
- **マイグレーションを含む更新の前には必ずバックアップ**: `migrate deploy` は既存データを書き換える
  ことがある（例: `20260923080000_monthly_budget_calendar` はグループの月次予算を月別予算に移し、
  既存の支出に支出日を付ける）。失敗や想定外に備えて、上記の更新の前に
  `mkdir -p ~/backups && cp prisma/dev.db ~/backups/dev-$(date +%F-%H%M).db` を実行しておく。
  戻す場合は `pm2 stop kakeibo-app` のうえでバックアップを `prisma/dev.db` にコピーし直し、
  更新前のコミットに `git checkout` してから再ビルド・再起動する
- **月別予算への移行（002）の注意**: 移行時点でグループに設定されていた月次予算は、`migrate deploy`
  を実行した月（日本時間）の設定額になり、その月が繰越の起点（繰越0円）になる
- **独自ドメインが欲しくなった場合**: 安価なドメイン（年数百円〜）を取得し、Cloudflareに追加して
  named tunnelに切り替えれば、`kakeibo.example.com`のような好きな名前にできる（Tailscale Funnelの
  `ts.net`URLのままでも機能上は問題ない）
