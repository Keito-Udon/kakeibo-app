import { test, expect, type Page } from "@playwright/test";

import { currentYearMonthJst } from "../../lib/date";
import {
  addExpenseViaApi,
  createGroupWithBudget,
  groupIdOnCalendar,
  login,
  signupAndLogin,
  uniqueEmail,
} from "./helpers";

// User Story 4 (P3): 複数グループへの所属と切り替え（quickstart.md シナリオ6、US4 AC4〜8）

async function openMenuItem(page: Page, testId: string) {
  await page.getByTestId("header-menu-button").click();
  await page.getByTestId(testId).click();
}

test("グループを作成・切り替えでき、最後に選んだグループが次回も開く", async ({ page, browser }) => {
  const thisMonth = currentYearMonthJst();
  const day = `${thisMonth}-05`;
  const email = uniqueEmail("multi");

  // US4 AC5: 未所属ならログイン後はグループ作成画面
  await signupAndLogin(page, email, "複数太郎");
  await page.waitForURL("/groups/new");
  await createGroupWithBudget(page, "グループ1", 20000);
  const group1Id = await groupIdOnCalendar(page);
  await addExpenseViaApi(page, group1Id, 1000, day);

  // US4 AC4: メニューからグループを作ると、新しいグループの初回予算画面へ
  await openMenuItem(page, "header-menu-create-group");
  await page.waitForURL("/groups/new");
  await expect(page.getByTestId("groups-new-back")).toBeVisible();
  await createGroupWithBudget(page, "グループ2", 30000);
  await expect(page.getByTestId("calendar-group-name")).toHaveText("グループ2");
  await expect(page.getByTestId(`calendar-day-amount-${day}`)).toHaveCount(0);

  // US4 AC6: 切り替え画面で元のグループを選ぶ
  await openMenuItem(page, "header-menu-switch-group");
  await page.waitForURL("/groups");
  const items = page.getByTestId("group-switch-item");
  await expect(items).toHaveCount(2);
  await expect(items.filter({ hasText: "グループ2" })).toHaveAttribute("data-selected", "true");
  await items.filter({ hasText: "グループ1" }).click();
  await page.waitForURL(`/months/${thisMonth}`);
  await expect(page.getByTestId("calendar-group-name")).toHaveText("グループ1");
  await expect(page.getByTestId(`calendar-day-amount-${day}`)).toHaveText("1,000");

  // US4 AC7, FR-028: 再ログインでも最後に選んだグループ
  await openMenuItem(page, "header-menu-logout");
  await page.waitForURL("/login");
  await login(page, email);
  await page.waitForURL(`/months/${thisMonth}`);
  await expect(page.getByTestId("calendar-group-name")).toHaveText("グループ1");

  // US4 AC8: 別ユーザーのグループの招待リンクから参加すると、そのグループが選択中になり、所属は3つになる
  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  await signupAndLogin(owner, uniqueEmail("multi-owner"), "招待主");
  await createGroupWithBudget(owner, "グループC", 10000);
  const groupCId = await groupIdOnCalendar(owner);
  const invite = await (await owner.request.post(`/api/groups/${groupCId}/invite`)).json();
  await ownerContext.close();

  await page.goto(new URL(invite.inviteUrl).pathname);
  await page.waitForURL(`/months/${thisMonth}`);
  await expect(page.getByTestId("calendar-group-name")).toHaveText("グループC");
  await page.goto("/groups");
  await expect(items).toHaveCount(3);
  await expect(items.filter({ hasText: "グループC" })).toHaveAttribute("data-selected", "true");
});
