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

  // FR-003: 予算を決めずにカレンダー・日別詳細・支出追加を開こうとすると予算決定画面に戻される
  for (const path of [`/months/${thisMonth}`, `/days/${thisMonth}-05`, "/expenses/new"]) {
    await page.goto(path);
    await page.waitForURL(`/months/${thisMonth}/budget`);
  }

  // FR-002: 決定するとカレンダーへ（直前の読み込みのハイドレーションを待ってから入力する）
  await page.waitForLoadState("networkidle");
  await page.getByTestId("budget-form-amount").fill("20000");
  await page.getByTestId("budget-form-submit").click();
  await page.waitForURL(`/months/${thisMonth}`);
  await expect(page.getByTestId("calendar-remaining")).toContainText("20,000円");

  // 再ログインでは予算決定画面を経由せず、直接カレンダーへ（FR-001(3), SC-001）
  await page.getByTestId("header-menu-button").click();
  await page.getByTestId("header-menu-logout").click();
  await page.waitForURL("/login");
  await login(page, email);
  await page.waitForURL(`/months/${thisMonth}`);
  await expect(page.getByTestId("calendar")).toBeVisible();
});
