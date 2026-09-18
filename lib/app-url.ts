// リバースプロキシ（Tailscale Funnel等）経由だと、Next.jsが認識するrequest.urlの
// オリジンは内部的なlocalhostになってしまうことがある。NEXTAUTH_URLに設定した
// 公開URLを優先し、未設定時（ローカル開発等）のみrequest.urlから推測する。
export function getAppOrigin(request: Request): string {
  return process.env.NEXTAUTH_URL ?? new URL(request.url).origin;
}
