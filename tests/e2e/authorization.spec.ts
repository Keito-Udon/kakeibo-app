import { test, expect } from "@playwright/test";

import { currentYearMonthJst } from "../../lib/date";
import {
  addExpenseViaApi,
  createGroupWithBudget,
  currentUserId,
  groupIdOnCalendar,
  signupAndLogin,
  uniqueEmail,
} from "./helpers";

// グループ外のユーザーによる操作の拒否（FR-017、Edge Cases「グループ外のユーザーのアクセスは拒否」、001のFR-007）

test("グループ外のユーザーは支払者にも操作者にもなれず、他のグループの支出を編集できない", async ({
  page,
  browser,
}) => {
  const thisMonth = currentYearMonthJst();
  const day = `${thisMonth}-05`;

  // グループの持ち主A（予算20,000円、支出1,000円）
  await signupAndLogin(page, uniqueEmail("auth-owner"), "持ち主");
  await createGroupWithBudget(page, "権限テスト", 20000);
  const groupId = await groupIdOnCalendar(page);
  const ownerId = await currentUserId(page);
  const expense = await addExpenseViaApi(page, groupId, 1000, day, "正しい支出");

  // 部外者O（自分のグループと予算を持つ）
  const outsiderContext = await browser.newContext();
  const outsider = await outsiderContext.newPage();
  await signupAndLogin(outsider, uniqueEmail("auth-outsider"), "部外者");
  await createGroupWithBudget(outsider, "部外者の家", 5000);
  const outsiderId = await currentUserId(outsider);

  async function dayOfOwnerGroup() {
    return (await page.request.get(`/api/groups/${groupId}/days/${day}`)).json();
  }

  // FR-017: 支払者はグループのメンバーに限る（追加・編集とも400）
  const invalidCreate = await page.request.post(`/api/groups/${groupId}/expenses`, {
    data: {
      amount: 500,
      title: "部外者払い",
      paidById: outsiderId,
      paymentMethod: "CASH",
      spentOn: day,
    },
  });
  expect(invalidCreate.status()).toBe(400);
  const invalidUpdate = await page.request.patch(
    `/api/groups/${groupId}/expenses/${expense.id}`,
    { data: { paidById: outsiderId } },
  );
  expect(invalidUpdate.status()).toBe(400);

  let current = await dayOfOwnerGroup();
  expect(current.total).toBe(1000);
  expect(current.expenses).toHaveLength(1);
  expect(current.expenses[0].paidBy.id).toBe(ownerId);

  // (a) 部外者は他のグループの予算を変えられない
  const budget = await outsider.request.put(`/api/groups/${groupId}/months/${thisMonth}/budget`, {
    data: { amount: 1 },
  });
  expect(budget.status()).toBe(403);
  const month = await (await page.request.get(`/api/groups/${groupId}/months/${thisMonth}`)).json();
  expect(month.budget.setAmount).toBe(20000);

  // (b) 部外者は他のグループに支出を追加できない
  const foreignCreate = await outsider.request.post(`/api/groups/${groupId}/expenses`, {
    data: {
      amount: 999,
      title: "侵入",
      paidById: outsiderId,
      paymentMethod: "CASH",
      spentOn: day,
    },
  });
  expect(foreignCreate.status()).toBe(403);
  current = await dayOfOwnerGroup();
  expect(current.total).toBe(1000);

  // (c) 部外者が他のグループの支出の編集画面を開くと404
  const editPage = await outsider.goto(`/expenses/${expense.id}/edit`);
  expect(editPage?.status()).toBe(404);
  await expect(outsider.getByTestId("expense-form")).toHaveCount(0);

  await outsiderContext.close();
});
