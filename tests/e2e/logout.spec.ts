import { test } from "@playwright/test";

import { signupAndLogin, uniqueEmail } from "./helpers";

// FR-002: ログアウト操作でセッションが失効し、認証必須ページへのアクセスが/loginにリダイレクトされること

test("ログアウトするとセッションが失効し、再度保護ページにアクセスするとログイン画面に戻る", async ({ page }) => {
  await signupAndLogin(page, uniqueEmail("logout"), "ログアウト太郎");

  await page.getByTestId("logout-button").click();
  await page.waitForURL("/login");

  // ログアウト後は保護ページ（トップ）に直接アクセスしてもログイン画面に戻される
  await page.goto("/");
  await page.waitForURL("/login");
});
