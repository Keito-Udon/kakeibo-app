import { test, expect } from "@playwright/test";

import { addMonths, currentYearMonthJst } from "../../lib/date";
import {
  addExpenseViaApi as addExpense,
  createGroupWithBudget,
  groupIdOnCalendar,
  signupAndLogin,
  uniqueEmail,
} from "./helpers";

// User Story 1 (P1): カレンダーで月の支出を把握する（quickstart.md シナリオ2）

test("カレンダーに日別合計・残額が表示され、月を移動でき、変更が自動で反映される", async ({
  page,
  browser,
}) => {
  const thisMonth = currentYearMonthJst();

  await signupAndLogin(page, uniqueEmail("calendar"), "カレンダー太郎");
  await createGroupWithBudget(page, "カレンダーテスト", 20000);
  const groupId = await groupIdOnCalendar(page);

  await addExpense(page, groupId, 1000, `${thisMonth}-05`);
  await addExpense(page, groupId, 500, `${thisMonth}-05`);
  await addExpense(page, groupId, 2000, `${thisMonth}-10`);
  await page.reload();

  await expect(page.getByTestId("calendar-group-name")).toHaveText("カレンダーテスト");
  const [year, month] = thisMonth.split("-").map(Number);
  await expect(page.getByTestId("calendar-year-month")).toHaveText(`${year}年${month}月`);

  // FR-014: 日別合計。支出のない日には金額を出さない
  await expect(page.getByTestId(`calendar-day-amount-${thisMonth}-05`)).toHaveText("1,500");
  await expect(page.getByTestId(`calendar-day-amount-${thisMonth}-10`)).toHaveText("2,000");
  await expect(page.getByTestId(`calendar-day-amount-${thisMonth}-06`)).toHaveCount(0);
  await expect(page.getByTestId(`calendar-day-${thisMonth}-06`)).toBeVisible();

  // FR-013: 残額 = 20,000 - 3,500
  await expect(page.getByTestId("calendar-remaining")).toContainText("16,500円");

  // FR-015: 翌月は設定額20,000の引き継ぎ＋繰越16,500
  await page.getByTestId("calendar-next").click();
  await page.waitForURL(`/months/${addMonths(thisMonth, 1)}`);
  await expect(page.getByTestId("calendar-remaining")).toContainText("36,500円");

  // 予算開始月より前の月は「予算なし」
  await page.goto(`/months/${thisMonth}`);
  await page.getByTestId("calendar-prev").click();
  await page.waitForURL(`/months/${addMonths(thisMonth, -1)}`);
  await expect(page.getByTestId("calendar-remaining")).toContainText("予算なし");

  // FR-021: 別の画面（同じユーザーの別コンテキスト）が、操作なしで数秒以内に更新される
  const otherContext = await browser.newContext({ storageState: await page.context().storageState() });
  const otherPage = await otherContext.newPage();
  await otherPage.goto(`/months/${thisMonth}`);
  await expect(otherPage.getByTestId(`calendar-day-amount-${thisMonth}-20`)).toHaveCount(0);
  await addExpense(page, groupId, 1000, `${thisMonth}-20`);
  await expect(otherPage.getByTestId(`calendar-day-amount-${thisMonth}-20`)).toHaveText("1,000", {
    timeout: 10_000,
  });
  await expect(otherPage.getByTestId("calendar-remaining")).toContainText("15,500円");
  await otherContext.close();

  // 001のFR-007: グループ外のユーザーは月別APIにアクセスできない
  const outsiderContext = await browser.newContext();
  const outsider = await outsiderContext.newPage();
  await signupAndLogin(outsider, uniqueEmail("outsider"), "部外者");
  const forbidden = await outsider.request.get(`/api/groups/${groupId}/months/${thisMonth}`);
  expect(forbidden.status()).toBe(403);
  await outsiderContext.close();
});
