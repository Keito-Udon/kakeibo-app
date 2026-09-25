import { test, expect, type Page } from "@playwright/test";

import { currentYearMonthJst, todayJst } from "../../lib/date";
import {
  createGroupWithBudget,
  currentUserId,
  gotoForInput,
  groupIdOnCalendar,
  signupAndLogin,
  uniqueEmail,
} from "./helpers";

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

// 004 User Story 2: 日別詳細でタイトルとメモを省略せずに読む（US2 AC1〜4、SC-001、Edge Cases）
test("日別詳細でタイトルの下にメモの全文が改行を保って表示され、相手の変更も反映される", async ({
  page,
  browser,
}) => {
  const day = `${currentYearMonthJst()}-14`;

  await signupAndLogin(page, uniqueEmail("memo-view-a"), "表示A");
  await createGroupWithBudget(page, "メモ表示テスト", 20000);
  const groupId = await groupIdOnCalendar(page);
  const aId = await currentUserId(page);
  const invite = await (await page.request.post(`/api/groups/${groupId}/invite`)).json();

  async function addWithMemo(title: string, memo?: string) {
    const response = await page.request.post(`/api/groups/${groupId}/expenses`, {
      data: { amount: 100, title, memo, paidById: aId, paymentMethod: "CASH", spentOn: day },
    });
    expect(response.status()).toBe(201);
    return response.json();
  }

  // 同じ文字の繰り返しではなく、途中で切れたら分かる200文字の文
  let longMemo = "";
  for (let i = 1; longMemo.length < 200; i++) longMemo += `${i}.品目${i} `;
  longMemo = longMemo.slice(0, 200);
  expect(longMemo).toHaveLength(200);

  const withBreaks = await addWithMemo("スーパー", "野菜・牛乳\n\n○○店");
  await addWithMemo("長いメモ", longMemo);
  await addWithMemo("メモなし");

  // メンバーBを横幅390pxで開く
  const contextB = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const pageB = await contextB.newPage();
  await signupAndLogin(pageB, uniqueEmail("memo-view-b"), "表示B");
  await pageB.goto(new URL(invite.inviteUrl).pathname);
  await pageB.waitForURL(/\/months\//);
  await pageB.goto(`/days/${day}`);

  const itemOf = (title: string) =>
    pageB.getByTestId("day-expense-item").filter({
      has: pageB.getByTestId("day-expense-title").getByText(title, { exact: true }),
    });

  // AC1: 改行と空行を保って表示する
  await expect(itemOf("スーパー").getByTestId("day-expense-title")).toHaveText("スーパー");
  expect(await itemOf("スーパー").getByTestId("day-expense-memo").innerText()).toBe("野菜・牛乳\n\n○○店");

  // AC2, SC-001: 200文字のメモを省略せず、横にはみ出さない
  const longEl = itemOf("長いメモ").getByTestId("day-expense-memo");
  expect(await longEl.innerText()).toBe(longMemo);
  const overflow = await longEl.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(overflow).toBe(false);

  // AC3: メモのない支出にはメモの要素を出さない
  await expect(itemOf("メモなし").getByTestId("day-expense-memo")).toHaveCount(0);

  // AC4, FR-006: Aがメモを変えると、Bの画面に数秒以内に反映される
  const patched = await page.request.patch(`/api/groups/${groupId}/expenses/${withBreaks.id}`, {
    data: { memo: "変更後のメモ" },
  });
  expect(patched.status()).toBe(200);
  await expect(itemOf("スーパー").getByTestId("day-expense-memo")).toHaveText("変更後のメモ", {
    timeout: 10_000,
  });

  await contextB.close();
});
