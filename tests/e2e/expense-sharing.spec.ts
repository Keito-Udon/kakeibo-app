import { test, expect, type Page } from "@playwright/test";

// User Story 1 (P1): 支出の記録とグループ共有閲覧
// quickstart.md シナリオ1〜4に対応する一連のフロー。

async function signup(page: Page, email: string, password: string, displayName: string) {
  await page.goto("/signup");
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill(password);
  await page.getByTestId("signup-displayname").fill(displayName);
  await page.getByTestId("signup-submit").click();
  await page.waitForURL("/login");
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL("/");
}

test("2人のユーザーがグループを共有し、支出記録が数秒以内に反映される", async ({ browser }) => {
  const stamp = Date.now();
  const emailA = `a-${stamp}@example.com`;
  const emailB = `b-${stamp}@example.com`;
  const password = "password123";

  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await signup(pageA, emailA, password, "ユーザーA");
  await login(pageA, emailA, password);

  // グループ作成（User Story 1, acceptance scenario 1の前提）
  await pageA.getByTestId("create-group-name").fill("テスト家計簿");
  await pageA.getByTestId("create-group-submit").click();
  await expect(pageA.getByTestId("group-name")).toHaveText("テスト家計簿");

  // 招待リンクを発行（FR-014）
  await pageA.getByTestId("invite-generate").click();
  const inviteUrl = await pageA.getByTestId("invite-url").innerText();
  expect(inviteUrl).toContain("/invite/");

  // ユーザーBが参加する
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await signup(pageB, emailB, password, "ユーザーB");
  await login(pageB, emailB, password);
  await pageB.goto(inviteUrl.replace(/^https?:\/\/[^/]+/, ""));
  await expect(pageB.getByTestId("group-name")).toHaveText("テスト家計簿");

  // ユーザーAが支出を記録する（FR-005）
  await pageA.getByTestId("expense-amount").fill("1500");
  await pageA.getByTestId("expense-description").fill("コンビニ");
  await pageA.getByTestId("expense-payment-method").selectOption("MOBILE");
  await pageA.getByTestId("expense-submit").click();
  await expect(pageA.getByTestId("expense-list")).toContainText("コンビニ");

  // ユーザーBの画面に、リロードなしで数秒以内に反映される（FR-013, SC-002）
  await expect(pageB.getByTestId("expense-list")).toContainText("コンビニ", { timeout: 10_000 });

  await contextA.close();
  await contextB.close();
});
