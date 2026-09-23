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
    data: { amount, description: `支払 ${amount}`, paidById, paymentMethod: "CASH", spentOn },
  });
  expect(response.status()).toBe(201);
  return response.json();
}

function item(page: Page, index: number) {
  return page.getByTestId("member-spending-item").nth(index);
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
