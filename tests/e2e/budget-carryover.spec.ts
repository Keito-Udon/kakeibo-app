import { test, expect } from "@playwright/test";

import { addMonths, currentYearMonthJst } from "../../lib/date";
import {
  addExpenseViaApi,
  createGroupWithBudget,
  groupIdOnCalendar,
  signupAndLogin,
  uniqueEmail,
} from "./helpers";

// User Story 2 (P1): 月ごとの予算変更と繰越（quickstart.md シナリオ4、US2 AC4〜9）

test("年月から予算を変更でき、余り・超過が翌月に繰り越される", async ({ page }) => {
  const thisMonth = currentYearMonthJst();
  const nextMonth = addMonths(thisMonth, 1);

  await signupAndLogin(page, uniqueEmail("carryover"), "繰越花子");
  await createGroupWithBudget(page, "繰越テスト", 20000);
  const groupId = await groupIdOnCalendar(page);

  // FR-006: 年月をタップすると、その月の予算画面に設定額と繰越額が出る
  await page.getByTestId("calendar-year-month").click();
  await page.waitForURL(`/months/${thisMonth}/budget`);
  await expect(page.getByTestId("budget-form-amount")).toHaveValue("20000");
  await expect(page.getByTestId("budget-form-carryover")).toContainText("0円");
  await page.getByTestId("budget-form-back").click();
  await page.waitForURL(`/months/${thisMonth}`);

  // US2 AC5: 翌月だけ設定額を25,000にする。翌月の予算 = 25,000 + 今月の余り20,000
  await page.getByTestId("calendar-next").click();
  await page.waitForURL(`/months/${nextMonth}`);
  await page.getByTestId("calendar-year-month").click();
  await page.waitForURL(`/months/${nextMonth}/budget`);
  await expect(page.getByTestId("budget-form-amount")).toHaveValue("20000"); // 引き継ぎ（FR-008）
  await expect(page.getByTestId("budget-form-carryover")).toContainText("20,000円");
  await page.getByTestId("budget-form-amount").fill("25000");
  await page.getByTestId("budget-form-submit").click();
  await page.waitForURL(`/months/${nextMonth}`);
  await expect(page.getByTestId("calendar-remaining")).toContainText("45,000円");

  // 今月の設定額は20,000のまま
  await page.goto(`/months/${thisMonth}/budget`);
  await expect(page.getByTestId("budget-form-amount")).toHaveValue("20000");

  // US2 AC8, FR-012: 今月3,000円超過すると、今月は赤字で-3,000円、翌月は25,000 − 3,000
  await addExpenseViaApi(page, groupId, 23000, `${thisMonth}-15`);
  await page.goto(`/months/${thisMonth}`);
  const remaining = page.getByTestId("calendar-remaining");
  await expect(remaining).toContainText("-3,000円");
  await expect(remaining).toHaveAttribute("data-negative", "true");
  await page.goto(`/months/${nextMonth}`);
  await expect(page.getByTestId("calendar-remaining")).toContainText("22,000円");

  // FR-007: 0円は保存できない
  await page.goto(`/months/${nextMonth}/budget`);
  await page.getByTestId("budget-form-amount").fill("0");
  await page.getByTestId("budget-form-submit").click();
  await expect(page.getByTestId("budget-form-error")).toBeVisible();
  await expect(page).toHaveURL(`/months/${nextMonth}/budget`);
  await page.goto(`/months/${nextMonth}`);
  await expect(page.getByTestId("calendar-remaining")).toContainText("22,000円");
});
