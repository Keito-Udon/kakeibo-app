import { test, expect, type Page } from "@playwright/test";

import { addMonths, currentYearMonthJst } from "../../lib/date";
import {
  createGroupWithBudget,
  currentUserId,
  groupIdOnCalendar,
  signupAndLogin,
  uniqueEmail,
} from "./helpers";

// 003 User Story 1: 表示中の月の、メンバーごとの支払額（quickstart.md シナリオ1〜3, 5）

// 支払者を指定して支出を登録する（記録するのは page のユーザー）
async function addPaidExpense(
  page: Page,
  groupId: string,
  paidById: string,
  amount: number,
  spentOn: string,
) {
  const response = await page.request.post(`/api/groups/${groupId}/expenses`, {
    data: { amount, title: `支払 ${amount}`, paidById, paymentMethod: "CASH", spentOn },
  });
  expect(response.status()).toBe(201);
  return response.json();
}

function item(page: Page, index: number) {
  return page.getByTestId("member-spending-item").nth(index);
}

// 割合の棒の長さ（棒の幅 ÷ 外枠の幅）。FR-002「割合の大きさが分かる棒」
function barRatio(page: Page, index: number) {
  return item(page, index)
    .getByTestId("member-spending-bar")
    .evaluate(
      (el) =>
        el.getBoundingClientRect().width /
        (el.parentElement as HTMLElement).getBoundingClientRect().width,
    );
}

async function expectItem(page: Page, index: number, name: string, amount: string, percent: string) {
  await expect(item(page, index).getByTestId("member-spending-name")).toHaveText(name, {
    timeout: 10_000,
  });
  await expect(item(page, index).getByTestId("member-spending-amount")).toHaveText(amount);
  await expect(item(page, index).getByTestId("member-spending-percent")).toHaveText(percent);
}

test("カレンダーの左に、支払者ごとの支払額と割合が表示され、月の移動と相手の変更に追随する", async ({
  page,
  browser,
}) => {
  const thisMonth = currentYearMonthJst();

  // ユーザーAがグループを作り、ユーザーBが招待リンクから参加する
  await signupAndLogin(page, uniqueEmail("pay-a"), "支払A");
  await createGroupWithBudget(page, "支払テスト", 20000);
  const groupId = await groupIdOnCalendar(page);
  const aId = await currentUserId(page);
  const invite = await (await page.request.post(`/api/groups/${groupId}/invite`)).json();

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await signupAndLogin(pageB, uniqueEmail("pay-b"), "支払B");
  await pageB.goto(new URL(invite.inviteUrl).pathname);
  await pageB.waitForURL(`/months/${thisMonth}`);
  const bId = await currentUserId(pageB);

  // US1 AC1〜2: どちらもAが記録するが、Bの分は支払者Bとして数える
  const paidByA = await addPaidExpense(page, groupId, aId, 3000, `${thisMonth}-05`);
  const paidByB = await addPaidExpense(page, groupId, bId, 1000, `${thisMonth}-06`);
  await page.reload();
  await expect(page.getByTestId("member-spending-item")).toHaveCount(2);
  await expectItem(page, 0, "支払A", "3,000円", "75%");
  await expectItem(page, 1, "支払B", "1,000円", "25%");
  expect(await barRatio(page, 0)).toBeCloseTo(0.75, 1);
  expect(await barRatio(page, 1)).toBeCloseTo(0.25, 1);

  // SC-002: 支払額の合計はその月の支出合計と一致する
  const month = await (await page.request.get(`/api/groups/${groupId}/months/${thisMonth}`)).json();
  const sum = month.memberTotals.reduce((s: number, m: { amount: number }) => s + m.amount, 0);
  expect(sum).toBe(month.spent);

  // US1 AC3: 支払額が0円になったメンバーも表示され続ける
  await page.request.delete(`/api/groups/${groupId}/expenses/${paidByB.id}`);
  await expectItem(page, 0, "支払A", "3,000円", "100%");
  await expectItem(page, 1, "支払B", "0円", "0%");

  // US1 AC4〜5: 翌月に移ると左の列も翌月になり、支出がなければ「支出なし」
  await page.getByTestId("calendar-next").click();
  await page.waitForURL(`/months/${addMonths(thisMonth, 1)}`);
  await expectItem(page, 0, "支払A", "0円", "支出なし");
  await expectItem(page, 1, "支払B", "0円", "支出なし");
  expect(await barRatio(page, 0)).toBe(0);
  expect(await barRatio(page, 1)).toBe(0);

  // US1 AC6, FR-008: Bの画面は、Aの追加と支払者の変更を数秒以内に反映する
  await expectItem(pageB, 0, "支払A", "3,000円", "100%");
  await addPaidExpense(page, groupId, aId, 500, `${thisMonth}-07`);
  await expectItem(pageB, 0, "支払A", "3,500円", "100%");
  const patched = await page.request.patch(`/api/groups/${groupId}/expenses/${paidByA.id}`, {
    data: { paidById: bId },
  });
  expect(patched.status()).toBe(200);
  await expectItem(pageB, 0, "支払B", "3,000円", "86%");
  await expectItem(pageB, 1, "支払A", "500円", "14%");

  await contextB.close();
});

// 003 User Story 2: 狭い画面でも、名前と金額を省略せず、日付マスの金額もはみ出さない（quickstart.md シナリオ4）
test("スマホの幅でも左の列とカレンダーが両方とも省略・はみ出しなく読める", async ({ page, browser }) => {
  const thisMonth = currentYearMonthJst();
  const longName = "とても長い表示名のメンバーさんですよね！"; // 20文字

  await signupAndLogin(page, uniqueEmail("layout-a"), "レイアウトA");
  await createGroupWithBudget(page, "配置テスト", 20000);
  const groupId = await groupIdOnCalendar(page);
  const aId = await currentUserId(page);
  const invite = await (await page.request.post(`/api/groups/${groupId}/invite`)).json();

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await signupAndLogin(pageB, uniqueEmail("layout-b"), longName);
  await pageB.goto(new URL(invite.inviteUrl).pathname);
  await pageB.waitForURL(`/months/${thisMonth}`);
  const bId = await currentUserId(pageB);
  await contextB.close();

  // A: 合計123,456円。日別合計が「1,200」「3,480」「9,999」「1.3万」「9.6万」になる
  for (const [day, amount] of [["03", 1200], ["05", 3480], ["09", 9999], ["12", 13145], ["27", 95632]] as const) {
    await addPaidExpense(page, groupId, aId, amount, `${thisMonth}-${day}`);
  }
  // B: 合計1,234,567円（7桁）。日別合計はどれも「12.3万」
  for (let day = 13; day <= 21; day++) {
    await addPaidExpense(page, groupId, bId, 123456, `${thisMonth}-${day}`);
  }
  await addPaidExpense(page, groupId, bId, 123463, `${thisMonth}-22`);

  const storageState = await page.context().storageState();

  async function openAt(width: number) {
    const context = await browser.newContext({ viewport: { width, height: 760 }, storageState });
    const view = await context.newPage();
    await view.goto(`/months/${thisMonth}`);
    await expect(view.getByTestId(`calendar-day-amount-${thisMonth}-27`)).toBeVisible();
    await expect(view.getByTestId("member-spending-item")).toHaveCount(2);
    return { context, view };
  }

  async function expectLeftOfCalendar(view: Page) {
    const aside = (await view.getByTestId("member-spending").boundingBox())!;
    const grid = (await view.getByTestId("calendar-grid").boundingBox())!;
    expect(aside.x + aside.width).toBeLessThanOrEqual(grid.x);
    return aside;
  }

  for (const width of [390, 360]) {
    const { context, view } = await openAt(width);

    // (a) 名前と金額は省略しない（FR-006, Edge Cases: 7桁）
    await expectItem(view, 0, longName, "1,234,567円", "91%");
    await expectItem(view, 1, "レイアウトA", "123,456円", "9%");

    // (b) どの日付マスでも金額がマスからはみ出さない（SC-003）
    const clipped = await view
      .locator('[data-testid^="calendar-day-amount-"]')
      .evaluateAll((els) =>
        els
          .filter((el) => el.scrollWidth > (el.parentElement as HTMLElement).clientWidth)
          .map((el) => `${el.getAttribute("data-testid")}=${el.textContent}`),
      );
    expect(clipped, `clipped at ${width}px`).toEqual([]);

    // (c) 横スクロールが出ない
    const hScroll = await view.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hScroll, `horizontal scroll at ${width}px`).toBe(false);

    // (d) 左の列はカレンダーの左にある（FR-004）
    await expectLeftOfCalendar(view);
    await context.close();
  }

  // 640px以上では左の列を176pxに広げる（research.md #1）
  const { context, view } = await openAt(1024);
  const aside = await expectLeftOfCalendar(view);
  expect(Math.round(aside.width)).toBe(176);
  await context.close();
});
