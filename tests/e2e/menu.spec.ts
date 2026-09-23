import { test, expect } from "@playwright/test";

import { currentYearMonthJst } from "../../lib/date";
import { createGroupWithBudget, signupAndLogin, uniqueEmail } from "./helpers";

// User Story 4 (P3): 3点リーダーメニュー（US4 AC1〜3、FR-023〜FR-025）

test("メニューから招待リンクの発行とログアウトができる", async ({ page }) => {
  const thisMonth = currentYearMonthJst();
  await signupAndLogin(page, uniqueEmail("menu"), "メニュー太郎");
  await createGroupWithBudget(page, "メニューテスト", 20000);

  // FR-023: メニューの4項目
  await page.getByTestId("header-menu-button").click();
  await expect(page.getByTestId("header-menu-invite")).toBeVisible();
  await expect(page.getByTestId("header-menu-create-group")).toBeVisible();
  await expect(page.getByTestId("header-menu-switch-group")).toBeVisible();
  await expect(page.getByTestId("header-menu-logout")).toBeVisible();

  // FR-024: 招待リンク画面で発行できる
  await page.getByTestId("header-menu-invite").click();
  await page.waitForURL("/invite-link");
  await page.getByTestId("invite-generate").click();
  await expect(page.getByTestId("invite-url")).toContainText("/invite/");
  await page.getByTestId("invite-link-back").click();
  await page.waitForURL(`/months/${thisMonth}`);

  // FR-025: ログアウトするとログイン画面へ。保護された画面も開けなくなる
  await page.getByTestId("header-menu-button").click();
  await page.getByTestId("header-menu-logout").click();
  await page.waitForURL("/login");
  await page.goto(`/months/${thisMonth}`);
  await page.waitForURL("/login");
});
