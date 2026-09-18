import { test, expect, type Page } from "@playwright/test";

// User Story 2 (P2): 月次予算残額の可視化（quickstart.md シナリオ5）

async function signupAndLogin(page: Page, email: string, password: string, displayName: string) {
  await page.goto("/signup");
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill(password);
  await page.getByTestId("signup-displayname").fill(displayName);
  await page.getByTestId("signup-submit").click();
  await page.waitForURL("/login");

  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL("/");
}

test("月次予算に対する残額が正しく表示され、超過時はマイナス表示になる", async ({ page }) => {
  const stamp = Date.now();
  await signupAndLogin(page, `budget-${stamp}@example.com`, "password123", "予算太郎");

  await page.getByTestId("create-group-name").fill("予算テストグループ");
  await page.getByTestId("create-group-submit").click();
  await expect(page.getByTestId("group-name")).toHaveText("予算テストグループ");

  // 予算20,000円を設定（FR-008）
  await page.getByTestId("budget-input").fill("20000");
  await page.getByTestId("budget-submit").click();

  // 支出12,000円を記録
  await page.getByTestId("expense-amount").fill("12000");
  await page.getByTestId("expense-description").fill("食費");
  await page.getByTestId("expense-submit").click();

  await expect(page.getByTestId("budget-remaining")).toContainText("残額: 8000円", {
    timeout: 10_000,
  });

  // さらに10,000円追加し、予算超過（マイナス表示、FR-009 acceptance scenario 2）
  await page.getByTestId("expense-amount").fill("10000");
  await page.getByTestId("expense-description").fill("外食");
  await page.getByTestId("expense-submit").click();

  await expect(page.getByTestId("budget-remaining")).toContainText("残額: -2000円", {
    timeout: 10_000,
  });
});
