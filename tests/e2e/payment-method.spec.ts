import { test, expect } from "@playwright/test";

import { createGroup, signupAndLogin, uniqueEmail } from "./helpers";

// User Story 3 (P3): 支払い方法の記録（現金／モバイル決済）

test("支払い方法を選択して記録し、一覧で識別できる", async ({ page }) => {
  await signupAndLogin(page, uniqueEmail("payment"), "支払花子");

  await createGroup(page, "支払方法テストグループ");
  await expect(page.getByTestId("group-name")).toHaveText("支払方法テストグループ");

  await page.getByTestId("expense-amount").fill("2000");
  await page.getByTestId("expense-description").fill("サブスク");
  await page.getByTestId("expense-payment-method").selectOption("MOBILE");
  await page.getByTestId("expense-submit").click();

  await expect(page.getByTestId("expense-list")).toContainText("モバイル決済");
});
