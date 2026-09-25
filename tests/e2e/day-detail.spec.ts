import { test, expect } from "@playwright/test";

import { addMonths, currentYearMonthJst, todayJst } from "../../lib/date";
import {
  addExpenseViaApi,
  createGroupWithBudget,
  gotoForInput,
  groupIdOnCalendar,
  signupAndLogin,
  uniqueEmail,
} from "./helpers";

// User Story 3 (P2): 日別の支出詳細と支出の追加・編集・削除（quickstart.md シナリオ3、US3 AC1〜7）

test("日別詳細から支出を追加・編集・削除でき、カレンダーに反映される", async ({ page, browser }) => {
  const thisMonth = currentYearMonthJst();
  const day5 = `${thisMonth}-05`;
  const day6 = `${thisMonth}-06`;
  page.on("dialog", (dialog) => dialog.accept());

  await signupAndLogin(page, uniqueEmail("day"), "詳細太郎");
  await createGroupWithBudget(page, "日別テスト", 20000);
  const groupId = await groupIdOnCalendar(page);

  // FR-018: カレンダーの「＋」から開くと支出日は今日
  await page.getByTestId("calendar-add").click();
  await page.waitForURL(/\/expenses\/new/);
  await expect(page.getByTestId("expense-form-date")).toHaveValue(todayJst());

  await page.getByTestId("expense-form-amount").fill("1000");
  await page.getByTestId("expense-form-title").fill("ランチ");
  await page.getByTestId("expense-form-date").fill(day5);
  await page.getByTestId("expense-form-submit").click();

  // 保存後はその支出日の詳細へ。金額・内容・支払者・支払い方法が出る（US3 AC1）
  await page.waitForURL(`/days/${day5}`);
  const items = page.getByTestId("day-expense-item");
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText("1,000円");
  await expect(items.first()).toContainText("ランチ");
  await expect(items.first()).toContainText("詳細太郎");
  await expect(items.first()).toContainText("現金");

  // FR-018: 日別詳細の「＋」から開くと支出日はその日。支払い方法はモバイル決済（001のFR-011）
  await page.getByTestId("day-add").click();
  await page.waitForURL(`/expenses/new?date=${day5}`);
  await expect(page.getByTestId("expense-form-date")).toHaveValue(day5);
  await page.getByTestId("expense-form-amount").fill("500");
  await page.getByTestId("expense-form-title").fill("カフェ");
  await page.getByTestId("expense-form-payment-method").selectOption("MOBILE");
  await page.getByTestId("expense-form-submit").click();
  await page.waitForURL(`/days/${day5}`);
  await expect(items).toHaveCount(2);
  await expect(items.filter({ hasText: "カフェ" })).toContainText("モバイル決済");

  // FR-020: 編集で支出日を翌日に変えると、翌日の詳細へ移り、カレンダーの両日が更新される
  await items.filter({ hasText: "ランチ" }).getByTestId("day-expense-edit").click();
  await page.waitForURL(/\/expenses\/.+\/edit/);
  await expect(page.getByTestId("expense-form-amount")).toHaveValue("1000");
  await page.getByTestId("expense-form-date").fill(day6);
  await page.getByTestId("expense-form-submit").click();
  await page.waitForURL(`/days/${day6}`);
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText("ランチ");

  await page.getByTestId("day-back").click();
  await page.waitForURL(`/months/${thisMonth}`);
  await expect(page.getByTestId(`calendar-day-amount-${day5}`)).toHaveText("500");
  await expect(page.getByTestId(`calendar-day-amount-${day6}`)).toHaveText("1,000");

  // FR-016: 日付マスをタップすると日別詳細へ。削除すると一覧・カレンダー・残額が更新される
  await page.getByTestId(`calendar-day-${day5}`).click();
  await page.waitForURL(`/days/${day5}`);
  await items.filter({ hasText: "カフェ" }).getByTestId("day-expense-delete").click();
  await expect(page.getByTestId("day-empty")).toBeVisible();
  await page.getByTestId("day-back").click();
  await page.waitForURL(`/months/${thisMonth}`);
  await expect(page.getByTestId(`calendar-day-amount-${day5}`)).toHaveCount(0);
  await expect(page.getByTestId("calendar-remaining")).toContainText("19,000円");

  // US3 AC2: 支出のない日
  await page.goto(`/days/${thisMonth}-07`);
  await expect(page.getByTestId("day-empty")).toBeVisible();

  // FR-022: 0円・マイナスは保存できない
  await gotoForInput(page, `/expenses/new?date=${thisMonth}-07`);
  await page.getByTestId("expense-form-title").fill("ゼロ");
  for (const amount of ["0", "-100"]) {
    await page.getByTestId("expense-form-amount").fill(amount);
    await page.getByTestId("expense-form-submit").click();
    await expect(page.getByTestId("expense-form-error")).toBeVisible();
    await expect(page).toHaveURL(`/expenses/new?date=${thisMonth}-07`);
  }

  // Edge Cases: 編集中に別の端末で削除されたら、保存時に既に削除された旨を出す
  const expense = await addExpenseViaApi(page, groupId, 800, `${thisMonth}-08`, "消える支出");
  await gotoForInput(page, `/expenses/${expense.id}/edit`);
  const deleted = await page.request.delete(`/api/groups/${groupId}/expenses/${expense.id}`);
  expect(deleted.status()).toBe(204);
  await page.getByTestId("expense-form-amount").fill("900");
  await page.getByTestId("expense-form-submit").click();
  await expect(page.getByTestId("expense-form-error")).toContainText("既に削除");

  // Edge Cases: 支出日を翌月に変えると、変更前と変更後の両方の月の合計・残額が再計算される
  const nextMonth = addMonths(thisMonth, 1);
  const moving = await addExpenseViaApi(page, groupId, 2500, `${thisMonth}-20`, "月またぎ");
  await page.goto(`/months/${thisMonth}`);
  await expect(page.getByTestId(`calendar-day-amount-${thisMonth}-20`)).toHaveText("2,500");
  await expect(page.getByTestId("calendar-remaining")).toContainText("16,500円");
  await gotoForInput(page, `/expenses/${moving.id}/edit`);
  await page.getByTestId("expense-form-date").fill(`${nextMonth}-03`);
  await page.getByTestId("expense-form-submit").click();
  await page.waitForURL(`/days/${nextMonth}-03`);
  await page.goto(`/months/${thisMonth}`);
  await expect(page.getByTestId(`calendar-day-amount-${thisMonth}-20`)).toHaveCount(0);
  await expect(page.getByTestId("calendar-remaining")).toContainText("19,000円");
  await page.goto(`/months/${nextMonth}`);
  await expect(page.getByTestId(`calendar-day-amount-${nextMonth}-03`)).toHaveText("2,500");
  // 翌月 = 設定額20,000（引き継ぎ）＋ 繰越19,000 − 2,500
  await expect(page.getByTestId("calendar-remaining")).toContainText("36,500円");

  // 001のFR-007: グループ外のユーザーは日別APIにアクセスできない
  const outsiderContext = await browser.newContext();
  const outsider = await outsiderContext.newPage();
  await signupAndLogin(outsider, uniqueEmail("day-outsider"), "部外者");
  const forbidden = await outsider.request.get(`/api/groups/${groupId}/days/${day5}`);
  expect(forbidden.status()).toBe(403);
  await outsiderContext.close();
});
