import { test, expect, type Page } from "@playwright/test";

import { currentYearMonthJst, todayJst } from "../../lib/date";
import { createGroupWithBudget, gotoForInput, signupAndLogin, uniqueEmail } from "./helpers";

// 004 User Story 1: タイトルとメモを分けて支出を記録する（quickstart.md シナリオ1〜3、US1 AC1〜5、Edge Cases）

async function fillForm(page: Page, fields: { amount?: string; title?: string; memo?: string }) {
  if (fields.amount !== undefined) await page.getByTestId("expense-form-amount").fill(fields.amount);
  if (fields.title !== undefined) await page.getByTestId("expense-form-title").fill(fields.title);
  if (fields.memo !== undefined) await page.getByTestId("expense-form-memo").fill(fields.memo);
}

async function expectRejected(page: Page, url: string) {
  await page.getByTestId("expense-form-submit").click();
  await expect(page.getByTestId("expense-form-error")).toBeVisible();
  await expect(page).toHaveURL(url);
}

test("タイトルとメモを分けて記録・編集でき、上限と空のタイトルは保存できない", async ({ page }) => {
  const thisMonth = currentYearMonthJst();
  const today = todayJst();

  await signupAndLogin(page, uniqueEmail("memo"), "メモ太郎");
  await createGroupWithBudget(page, "メモテスト", 20000);

  // (1) AC1: タイトルと2行のメモで記録し、編集画面で改行を含めて同じ内容が出る
  await page.getByTestId("calendar-add").click();
  await page.waitForURL(/\/expenses\/new/);
  await fillForm(page, { amount: "1000", title: "スーパー", memo: "野菜・牛乳\n○○店" });
  await page.getByTestId("expense-form-submit").click();
  await page.waitForURL(`/days/${today}`);
  await page.getByTestId("day-expense-edit").first().click();
  await page.waitForURL(/\/expenses\/.+\/edit/);
  const editUrl = new URL(page.url()).pathname;
  await expect(page.getByTestId("expense-form-title")).toHaveValue("スーパー");
  await expect(page.getByTestId("expense-form-memo")).toHaveValue("野菜・牛乳\n○○店");

  // (2) AC2: タイトルだけでも保存できる
  const day10 = `${thisMonth}-10`;
  await gotoForInput(page, `/expenses/new?date=${day10}`);
  await fillForm(page, { amount: "500", title: "タイトルだけ" });
  await page.getByTestId("expense-form-submit").click();
  await page.waitForURL(`/days/${day10}`);
  await expect(page.getByTestId("day-expense-item")).toHaveCount(1);

  const newUrl = `/expenses/new?date=${thisMonth}-11`;
  await gotoForInput(page, newUrl);
  await fillForm(page, { amount: "100" });

  // (3) AC3: 空・空白だけのタイトルは保存できない
  await fillForm(page, { title: "" });
  await expectRejected(page, newUrl);
  await fillForm(page, { title: "   " });
  await expectRejected(page, newUrl);

  // (4) AC4: 51文字のタイトル・201文字のメモは、文字数が赤くなり保存できない
  await fillForm(page, { title: "あ".repeat(51) });
  await expect(page.getByTestId("expense-form-title-count")).toHaveText("51/50");
  await expect(page.getByTestId("expense-form-title-count")).toHaveAttribute("data-over", "true");
  await expectRejected(page, newUrl);
  await fillForm(page, { title: "ちょうど", memo: "い".repeat(201) });
  await expect(page.getByTestId("expense-form-title-count")).toHaveAttribute("data-over", "false");
  await expect(page.getByTestId("expense-form-memo-count")).toHaveText("201/200");
  await expect(page.getByTestId("expense-form-memo-count")).toHaveAttribute("data-over", "true");
  await expectRejected(page, newUrl);

  // (6) 文字数は前後の空白を除いて数える
  await fillForm(page, { title: "  スーパー  ", memo: "" });
  await expect(page.getByTestId("expense-form-title-count")).toHaveText("4/50");
  await expect(page.getByTestId("expense-form-memo-count")).toHaveText("0/200");

  // (5) 絵文字50個のタイトルは「50/50」で保存できる（見た目の1文字で数える）
  await fillForm(page, { title: "🍙".repeat(50) });
  await expect(page.getByTestId("expense-form-title-count")).toHaveText("50/50");
  await expect(page.getByTestId("expense-form-title-count")).toHaveAttribute("data-over", "false");
  await page.getByTestId("expense-form-submit").click();
  await page.waitForURL(`/days/${thisMonth}-11`);

  // (7) AC5: 編集でメモを空にして保存すると、メモが消える
  await gotoForInput(page, editUrl);
  await expect(page.getByTestId("expense-form-memo")).toHaveValue("野菜・牛乳\n○○店");
  await fillForm(page, { memo: "" });
  await page.getByTestId("expense-form-submit").click();
  await page.waitForURL(`/days/${today}`);
  await gotoForInput(page, editUrl);
  await expect(page.getByTestId("expense-form-title")).toHaveValue("スーパー");
  await expect(page.getByTestId("expense-form-memo")).toHaveValue("");
});
