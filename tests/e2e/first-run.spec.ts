import { test, expect } from "@playwright/test";

import { currentYearMonthJst } from "../../lib/date";
import { createGroup, login, signupAndLogin, uniqueEmail } from "./helpers";

// User Story 2 (P1): 初回の予算決定（quickstart.md シナリオ1、US2 AC1〜2、FR-001〜FR-003）

test("グループで最初の1回だけ、予算決定画面を経てカレンダーに進む", async ({ page }) => {
  const thisMonth = currentYearMonthJst();
  const email = uniqueEmail("first-run");

  await signupAndLogin(page, email, "初回太郎");
  await createGroup(page, "初回テスト");

  // FR-001(2): 予算が一度も設定されていなければ予算決定画面へ。初回は戻るボタンなし
  await page.waitForURL(`/months/${thisMonth}/budget`);
  await expect(page.getByTestId("budget-form")).toContainText("予算を決める");
  await expect(page.getByTestId("budget-form-back")).toHaveCount(0);

  // FR-003: 予算を決めずにカレンダーを開こうとすると予算決定画面に戻される
  await page.goto(`/months/${thisMonth}`);
  await page.waitForURL(`/months/${thisMonth}/budget`);

  // FR-002: 決定するとカレンダーへ
  await page.getByTestId("budget-form-amount").fill("20000");
  await page.getByTestId("budget-form-submit").click();
  await page.waitForURL(`/months/${thisMonth}`);
  await expect(page.getByTestId("calendar-remaining")).toContainText("20,000円");

  // 再ログインでは予算決定画面を経由しない（SC-001）
  await page.getByTestId("logout-button").click();
  await page.waitForURL("/login");
  await login(page, email);
  expect(new URL(page.url()).pathname).not.toContain("/budget");
});
