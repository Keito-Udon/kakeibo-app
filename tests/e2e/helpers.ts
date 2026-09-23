import type { Page } from "@playwright/test";

export const PASSWORD = "password123";

// 実行ごとに衝突しないメールアドレスを作る（E2EはローカルDBを共有するため）
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

export async function signup(page: Page, email: string, displayName: string) {
  await page.goto("/signup");
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill(PASSWORD);
  await page.getByTestId("signup-displayname").fill(displayName);
  await page.getByTestId("signup-submit").click();
  await page.waitForURL("/login");
}

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(PASSWORD);
  await page.getByTestId("login-submit").click();
  await page.waitForURL((url) => url.pathname !== "/login");
}

export async function signupAndLogin(page: Page, email: string, displayName: string) {
  await signup(page, email, displayName);
  await login(page, email);
}

// ログイン直後に表示されるグループ作成フォームからグループを作る
export async function createGroup(page: Page, name: string) {
  await page.getByTestId("create-group-name").fill(name);
  await page.getByTestId("create-group-submit").click();
}
