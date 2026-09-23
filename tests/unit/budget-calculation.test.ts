import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { getMonthSummary, hasAnyBudget, setMonthlyBudget } from "@/lib/budget";

// FR-005, FR-010〜FR-014: 月別の設定額・繰越と、支出日（spentOn）基準の集計
describe("monthly budget (DB)", () => {
  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];

  async function makeUser(suffix: string) {
    const user = await prisma.user.create({
      data: {
        email: `budget-${suffix}-${Date.now()}-${Math.random()}@example.com`,
        passwordHash: "test-hash",
        displayName: `Test ${suffix}`,
      },
    });
    createdUserIds.push(user.id);
    return user;
  }

  async function makeGroupWithMember(suffix: string) {
    const user = await makeUser(suffix);
    const group = await prisma.group.create({ data: { name: `budget ${suffix}` } });
    createdGroupIds.push(group.id);
    await prisma.groupMember.create({ data: { userId: user.id, groupId: group.id } });
    return { user, group };
  }

  async function addExpense(groupId: string, userId: string, amount: number, spentOn: string) {
    await prisma.expenseRecord.create({
      data: {
        groupId,
        amount,
        description: `expense ${spentOn}`,
        paidById: userId,
        paymentMethod: "CASH",
        createdById: userId,
        spentOn,
      },
    });
  }

  afterAll(async () => {
    await prisma.expenseRecord.deleteMany({ where: { groupId: { in: createdGroupIds } } });
    await prisma.monthlyBudget.deleteMany({ where: { groupId: { in: createdGroupIds } } });
    await prisma.groupMember.deleteMany({ where: { groupId: { in: createdGroupIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.group.deleteMany({ where: { id: { in: createdGroupIds } } });
  });

  it("aggregates only expenses whose spentOn is in the month, with daily totals", async () => {
    const { user, group } = await makeGroupWithMember("daily");
    await setMonthlyBudget(group.id, "2026-09", 20000, user.id);
    await addExpense(group.id, user.id, 1000, "2026-09-05");
    await addExpense(group.id, user.id, 500, "2026-09-05");
    await addExpense(group.id, user.id, 2000, "2026-09-10");
    await addExpense(group.id, user.id, 99999, "2026-08-31");
    await addExpense(group.id, user.id, 88888, "2026-10-01");

    const summary = await getMonthSummary(group.id, "2026-09");
    expect(summary.yearMonth).toBe("2026-09");
    expect(summary.spent).toBe(3500);
    expect(summary.dailyTotals).toEqual({ "2026-09-05": 1500, "2026-09-10": 2000 });
    expect(summary.budget).toEqual({ setAmount: 20000, carryover: 0, total: 20000 });
    expect(summary.remaining).toBe(16500);
  });

  it("carries over the previous month's remainder using the same rules as computeMonthSummary", async () => {
    const { user, group } = await makeGroupWithMember("carry");
    await setMonthlyBudget(group.id, "2026-09", 20000, user.id);
    await addExpense(group.id, user.id, 23000, "2026-09-15");

    const october = await getMonthSummary(group.id, "2026-10");
    expect(october.budget).toEqual({ setAmount: 20000, carryover: -3000, total: 17000 });
    expect(october.remaining).toBe(17000);
    expect(october.dailyTotals).toEqual({});

    const august = await getMonthSummary(group.id, "2026-08");
    expect(august.budget).toBeNull();
    expect(august.remaining).toBeNull();
  });

  it("setMonthlyBudget overwrites the same month only, and the last writer wins", async () => {
    const { user, group } = await makeGroupWithMember("upsert");
    const other = await makeUser("upsert-other");
    await prisma.groupMember.create({ data: { userId: other.id, groupId: group.id } });

    await setMonthlyBudget(group.id, "2026-09", 20000, user.id);
    await setMonthlyBudget(group.id, "2026-10", 25000, user.id);
    // Edge Cases: 同じ月をほぼ同時に変更したら、後から保存した値が残る
    await setMonthlyBudget(group.id, "2026-10", 30000, other.id);

    const rows = await prisma.monthlyBudget.findMany({
      where: { groupId: group.id },
      orderBy: { yearMonth: "asc" },
    });
    expect(rows.map((r) => [r.yearMonth, r.amount, r.updatedById])).toEqual([
      ["2026-09", 20000, user.id],
      ["2026-10", 30000, other.id],
    ]);
  });

  it("hasAnyBudget is true only after a budget is set", async () => {
    const { user, group } = await makeGroupWithMember("has");
    await expect(hasAnyBudget(group.id)).resolves.toBe(false);
    await setMonthlyBudget(group.id, "2026-09", 1, user.id);
    await expect(hasAnyBudget(group.id)).resolves.toBe(true);
  });
});
