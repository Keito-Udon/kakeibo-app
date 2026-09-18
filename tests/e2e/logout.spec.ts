import { test } from "@playwright/test";

// FR-002: ログアウト操作でセッションが失効し、認証必須ページへのアクセスが/loginにリダイレクトされること

test("ログアウトするとセッションが失効し、再度保護ページにアクセスするとログイン画面に戻る", async ({ page }) => {
  const stamp = Date.now();
  const email = `logout-${stamp}@example.com`;
  const password = "password123";

  await page.goto("/signup");
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill(password);
  await page.getByTestId("signup-displayname").fill("ログアウト太郎");
  await page.getByTestId("signup-submit").click();
  await page.waitForURL("/login");

  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL("/");

  await page.getByTestId("logout-button").click();
  await page.waitForURL("/login");

  // ログアウト後は保護ページ（トップ）に直接アクセスしてもログイン画面に戻される
  await page.goto("/");
  await page.waitForURL("/login");
});
