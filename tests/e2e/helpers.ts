import { expect, type Page } from "@playwright/test";

import { currentYearMonthJst } from "../../lib/date";

export const PASSWORD = "password123";

// 実行ごとに衝突しないメールアドレスを作る（E2EはローカルDBを共有するため）
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

// URLを直接開いたあと、フォームに入力する前にハイドレーションを待つ。待たずに入力すると、
// ハイドレーション時にReactが初期値で上書きし、入力が失われることがある
export async function gotoForInput(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
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

// グループを作り、続けて表示される予算画面（初回）で今月の設定額を保存する。カレンダーに着いて終わる
export async function createGroupWithBudget(page: Page, name: string, amount: number) {
  const thisMonth = currentYearMonthJst();
  await createGroup(page, name);
  await page.waitForURL(`/months/${thisMonth}/budget`);
  await page.getByTestId("budget-form-amount").fill(String(amount));
  await page.getByTestId("budget-form-submit").click();
  await page.waitForURL(`/months/${thisMonth}`);
}

export async function currentUserId(page: Page): Promise<string> {
  const session = await (await page.request.get("/api/auth/session")).json();
  return session.user.id;
}

// カレンダーの data-group-id から選択中グループのIDを読む
export async function groupIdOnCalendar(page: Page): Promise<string> {
  const groupId = await page.getByTestId("calendar").getAttribute("data-group-id");
  expect(groupId).toBeTruthy();
  return groupId!;
}

export async function addExpenseViaApi(
  page: Page,
  groupId: string,
  amount: number,
  spentOn: string,
  title = `支出 ${spentOn}`,
) {
  const response = await page.request.post(`/api/groups/${groupId}/expenses`, {
    data: {
      amount,
      title,
      paidById: await currentUserId(page),
      paymentMethod: "CASH",
      spentOn,
    },
  });
  expect(response.status()).toBe(201);
  return response.json();
}
