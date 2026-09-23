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

  // 003: メンバーごとの支払額（memberTotals）
  describe("memberTotals", () => {
    async function makePair(suffix: string) {
      const { user: a, group } = await makeGroupWithMember(`${suffix}-a`);
      const b = await makeUser(`${suffix}-b`);
      await prisma.groupMember.create({ data: { userId: b.id, groupId: group.id } });
      return { a, b, group };
    }

    // 記録した人（createdBy）と支払者（paidBy）を別々に指定できる
    async function addPaid(
      groupId: string,
      createdById: string,
      paidById: string,
      amount: number,
      spentOn: string,
    ) {
      return prisma.expenseRecord.create({
        data: {
          groupId,
          amount,
          description: `paid ${spentOn}`,
          paidById,
          paymentMethod: "CASH",
          createdById,
          spentOn,
        },
      });
    }

    function amountsOf(summary: Awaited<ReturnType<typeof getMonthSummary>>) {
      return Object.fromEntries(summary.memberTotals.map((m) => [m.userId, m.amount]));
    }

    it("(a) counts by payer, not by the member who recorded it", async () => {
      const { a, b, group } = await makePair("payer");
      await setMonthlyBudget(group.id, "2026-09", 20000, a.id);
      await addPaid(group.id, a.id, a.id, 3000, "2026-09-05");
      await addPaid(group.id, a.id, b.id, 1000, "2026-09-06");

      const summary = await getMonthSummary(group.id, "2026-09");
      expect(amountsOf(summary)).toEqual({ [a.id]: 3000, [b.id]: 1000 });
      expect(summary.memberTotals.map((m) => [m.userId, m.percent])).toEqual([
        [a.id, 75],
        [b.id, 25],
      ]);
    });

    it("(b) excludes other months and other groups", async () => {
      const { a, b, group } = await makePair("scope");
      const other = await makeGroupWithMember("scope-other");
      await prisma.groupMember.create({ data: { userId: a.id, groupId: other.group.id } });
      await addPaid(group.id, a.id, a.id, 1000, "2026-09-30");
      await addPaid(group.id, a.id, a.id, 5000, "2026-08-31");
      await addPaid(group.id, a.id, b.id, 7000, "2026-10-01");
      await addPaid(other.group.id, a.id, a.id, 9000, "2026-09-15");

      const summary = await getMonthSummary(group.id, "2026-09");
      expect(amountsOf(summary)).toEqual({ [a.id]: 1000, [b.id]: 0 });
    });

    it("(c) includes members without expenses and (d) sums to spent", async () => {
      const { a, b, group } = await makePair("sum");
      await addPaid(group.id, b.id, a.id, 1234, "2026-09-01");
      await addPaid(group.id, b.id, a.id, 766, "2026-09-02");

      const summary = await getMonthSummary(group.id, "2026-09");
      expect(summary.memberTotals).toHaveLength(2);
      expect(amountsOf(summary)[b.id]).toBe(0);
      expect(summary.memberTotals.reduce((s, m) => s + m.amount, 0)).toBe(summary.spent);
      expect(summary.spent).toBe(2000);
    });

    it("(e) shows amounts in months before the budget started", async () => {
      const { a, b, group } = await makePair("before");
      await setMonthlyBudget(group.id, "2026-09", 20000, a.id);
      await addPaid(group.id, a.id, b.id, 4000, "2026-08-10");

      const august = await getMonthSummary(group.id, "2026-08");
      expect(august.budget).toBeNull();
      expect(amountsOf(august)).toEqual({ [a.id]: 0, [b.id]: 4000 });
      expect(august.memberTotals[0]).toMatchObject({ userId: b.id, percent: 100 });
    });

    it("(f) moving an expense to the next month moves its amount", async () => {
      const { a, group } = await makePair("move");
      const expense = await addPaid(group.id, a.id, a.id, 2500, "2026-09-20");
      await addPaid(group.id, a.id, a.id, 500, "2026-09-21");

      await prisma.expenseRecord.update({ where: { id: expense.id }, data: { spentOn: "2026-10-03" } });

      expect(amountsOf(await getMonthSummary(group.id, "2026-09"))[a.id]).toBe(500);
      expect(amountsOf(await getMonthSummary(group.id, "2026-10"))[a.id]).toBe(2500);
    });
  });
});
