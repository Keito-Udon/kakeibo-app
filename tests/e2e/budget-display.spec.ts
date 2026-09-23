import { test, expect } from "@playwright/test";

import { createGroupWithBudget, signupAndLogin, uniqueEmail } from "./helpers";

// User Story 2 (P2): 月次予算残額の可視化（quickstart.md シナリオ5）

test("月次予算に対する残額が正しく表示され、超過時はマイナス表示になる", async ({ page }) => {
  await signupAndLogin(page, uniqueEmail("budget"), "予算太郎");

  // グループ作成後の初回予算決定を済ませてから、旧画面（/）で予算を設定し直す
  await createGroupWithBudget(page, "予算テストグループ", 1);
  await page.goto("/");
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
