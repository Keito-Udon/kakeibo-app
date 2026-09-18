import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { getBudgetSummary } from "@/lib/budget";

// FR-009 / Edge Cases: 当月分のみ集計し、予算未設定時はremainingがnullになること
describe("getBudgetSummary", () => {
  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];
  const createdExpenseIds: string[] = [];

  async function makeUser(suffix: string) {
    const user = await prisma.user.create({
      data: {
        email: `budget-${suffix}-${Date.now()}@example.com`,
        passwordHash: "test-hash",
        displayName: `Test ${suffix}`,
      },
    });
    createdUserIds.push(user.id);
    return user;
  }

  afterAll(async () => {
    await prisma.expenseRecord.deleteMany({ where: { id: { in: createdExpenseIds } } });
    await prisma.groupMember.deleteMany({ where: { groupId: { in: createdGroupIds } } });
    await prisma.group.deleteMany({ where: { id: { in: createdGroupIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  });

  it("returns remaining=null when monthlyBudget is unset", async () => {
    const group = await prisma.group.create({ data: { name: "no-budget group" } });
    createdGroupIds.push(group.id);

    const summary = await getBudgetSummary(group.id);
    expect(summary.monthlyBudget).toBeNull();
    expect(summary.remaining).toBeNull();
  });

  it("computes remaining from this month's expenses only, excluding other months", async () => {
    const user = await makeUser("calc");
    const group = await prisma.group.create({
      data: { name: "budget calc group", monthlyBudget: 20000 },
    });
    createdGroupIds.push(group.id);
    await prisma.groupMember.create({ data: { userId: user.id, groupId: group.id } });

    const thisMonthExpense = await prisma.expenseRecord.create({
      data: {
        groupId: group.id,
        amount: 12000,
        description: "this month",
        paidById: user.id,
        paymentMethod: "CASH",
        createdById: user.id,
      },
    });
    createdExpenseIds.push(thisMonthExpense.id);

    // 前月分（当月の集計に含めない）
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthExpense = await prisma.expenseRecord.create({
      data: {
        groupId: group.id,
        amount: 99999,
        description: "last month",
        paidById: user.id,
        paymentMethod: "CASH",
        createdById: user.id,
        createdAt: lastMonth,
      },
    });
    createdExpenseIds.push(lastMonthExpense.id);

    const summary = await getBudgetSummary(group.id);
    expect(summary.currentMonthTotal).toBe(12000);
    expect(summary.remaining).toBe(8000);
  });
});
