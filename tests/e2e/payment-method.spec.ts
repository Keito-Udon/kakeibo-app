import { test, expect } from "@playwright/test";

// User Story 3 (P3): 支払い方法の記録（現金／モバイル決済）

test("支払い方法を選択して記録し、一覧で識別できる", async ({ page }) => {
  const stamp = Date.now();
  const email = `payment-${stamp}@example.com`;

  await page.goto("/signup");
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill("password123");
  await page.getByTestId("signup-displayname").fill("支払花子");
  await page.getByTestId("signup-submit").click();
  await page.waitForURL("/login");

  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill("password123");
  await page.getByTestId("login-submit").click();
  await page.waitForURL("/");

  await page.getByTestId("create-group-name").fill("支払方法テストグループ");
  await page.getByTestId("create-group-submit").click();
  await expect(page.getByTestId("group-name")).toHaveText("支払方法テストグループ");

  await page.getByTestId("expense-amount").fill("2000");
  await page.getByTestId("expense-description").fill("サブスク");
  await page.getByTestId("expense-payment-method").selectOption("MOBILE");
  await page.getByTestId("expense-submit").click();

  await expect(page.getByTestId("expense-list")).toContainText("モバイル決済");
});
