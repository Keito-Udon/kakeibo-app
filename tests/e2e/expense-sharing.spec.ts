import { test, expect } from "@playwright/test";

import { currentYearMonthJst } from "../../lib/date";
import {
  addExpenseViaApi,
  createGroupWithBudget,
  groupIdOnCalendar,
  signupAndLogin,
  uniqueEmail,
} from "./helpers";

// 2人での共有と自動反映（quickstart.md シナリオ5、US1 AC6、US2 AC3、FR-009, FR-021）

test("招待されたメンバーはカレンダーに直接進み、相手の変更が数秒以内に反映される", async ({
  browser,
}) => {
  const thisMonth = currentYearMonthJst();
  const day = `${thisMonth}-12`;

  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await signupAndLogin(pageA, uniqueEmail("share-a"), "ユーザーA");
  await createGroupWithBudget(pageA, "共有家計簿", 20000);
  const groupId = await groupIdOnCalendar(pageA);

  // ユーザーAがメニューから招待リンクを発行する（FR-024）
  await pageA.getByTestId("header-menu-button").click();
  await pageA.getByTestId("header-menu-invite").click();
  await pageA.getByTestId("invite-generate").click();
  const inviteUrl = await pageA.getByTestId("invite-url").innerText();
  await pageA.goto(`/months/${thisMonth}`);

  // US2 AC3: ユーザーBは参加後、予算決定画面を経ずにカレンダーへ
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await signupAndLogin(pageB, uniqueEmail("share-b"), "ユーザーB");
  await pageB.goto(new URL(inviteUrl).pathname);
  await pageB.waitForURL(`/months/${thisMonth}`);
  await expect(pageB.getByTestId("calendar-group-name")).toHaveText("共有家計簿");
  await expect(pageB.getByTestId("calendar-remaining")).toContainText("20,000円");

  // 追加（FR-021）
  const expense = await addExpenseViaApi(pageA, groupId, 1500, day, "コンビニ");
  await expect(pageB.getByTestId(`calendar-day-amount-${day}`)).toHaveText("1,500", {
    timeout: 10_000,
  });
  await expect(pageB.getByTestId("calendar-remaining")).toContainText("18,500円");

  // 編集（001のFR-012）
  const patched = await pageA.request.patch(`/api/groups/${groupId}/expenses/${expense.id}`, {
    data: { amount: 2000 },
  });
  expect(patched.status()).toBe(200);
  await expect(pageB.getByTestId(`calendar-day-amount-${day}`)).toHaveText("2,000", {
    timeout: 10_000,
  });

  // 削除
  const deleted = await pageA.request.delete(`/api/groups/${groupId}/expenses/${expense.id}`);
  expect(deleted.status()).toBe(204);
  await expect(pageB.getByTestId(`calendar-day-amount-${day}`)).toHaveCount(0, { timeout: 10_000 });

  // 予算の変更も相手に反映される（FR-009）
  const budget = await pageA.request.put(`/api/groups/${groupId}/months/${thisMonth}/budget`, {
    data: { amount: 30000 },
  });
  expect(budget.status()).toBe(200);
  await expect(pageB.getByTestId("calendar-remaining")).toContainText("30,000円", {
    timeout: 10_000,
  });

  await contextA.close();
  await contextB.close();
});
