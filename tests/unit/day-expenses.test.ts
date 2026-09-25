import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { getDayExpenses } from "@/lib/expenses";

// FR-019: 日別詳細はその日（spentOn）の支出だけを、記録順に返す
describe("getDayExpenses", () => {
  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];

  afterAll(async () => {
    await prisma.expenseRecord.deleteMany({ where: { groupId: { in: createdGroupIds } } });
    await prisma.groupMember.deleteMany({ where: { groupId: { in: createdGroupIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.group.deleteMany({ where: { id: { in: createdGroupIds } } });
  });

  async function setup() {
    const user = await prisma.user.create({
      data: {
        email: `day-${Date.now()}-${Math.random()}@example.com`,
        passwordHash: "test-hash",
        displayName: "日別太郎",
      },
    });
    createdUserIds.push(user.id);
    const group = await prisma.group.create({ data: { name: "day group" } });
    const otherGroup = await prisma.group.create({ data: { name: "other day group" } });
    createdGroupIds.push(group.id, otherGroup.id);
    return { user, group, otherGroup };
  }

  async function addExpense(
    groupId: string,
    userId: string,
    amount: number,
    spentOn: string,
    createdAt: Date,
  ) {
    return prisma.expenseRecord.create({
      data: {
        groupId,
        amount,
        title: `${amount}円`,
        paidById: userId,
        paymentMethod: "MOBILE",
        createdById: userId,
        spentOn,
        createdAt,
      },
    });
  }

  it("returns only that day's expenses of the group in createdAt order, with the total and payer name", async () => {
    const { user, group, otherGroup } = await setup();
    const later = await addExpense(group.id, user.id, 500, "2026-09-05", new Date("2026-09-05T10:00:00Z"));
    const earlier = await addExpense(group.id, user.id, 1000, "2026-09-05", new Date("2026-09-05T01:00:00Z"));
    await addExpense(group.id, user.id, 2000, "2026-09-06", new Date("2026-09-06T01:00:00Z"));
    await addExpense(otherGroup.id, user.id, 9999, "2026-09-05", new Date("2026-09-05T02:00:00Z"));

    const day = await getDayExpenses(group.id, "2026-09-05");
    expect(day.date).toBe("2026-09-05");
    expect(day.total).toBe(1500);
    expect(day.expenses.map((e) => e.id)).toEqual([earlier.id, later.id]);
    expect(day.expenses[0].paidBy).toEqual({ id: user.id, displayName: "日別太郎" });
  });

  it("returns an empty list and zero total for a day without expenses", async () => {
    const { group } = await setup();
    const day = await getDayExpenses(group.id, "2026-09-07");
    expect(day).toEqual({ date: "2026-09-07", total: 0, expenses: [] });
  });
});
