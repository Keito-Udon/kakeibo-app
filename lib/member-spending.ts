import { prisma } from "@/lib/db";

export type MemberTotal = {
  userId: string;
  displayName: string;
  amount: number; // その月に、このメンバーが支払者である支出の合計（0あり）
  percent: number | null; // 整数%。その月の支出合計が0なら null
  colorIndex: number; // グループへの参加順（0始まり）。月や順位が変わっても色を固定するため
};

// members はグループへの参加順に並んでいること（003 data-model.md, research.md #3, #4）
export function computeMemberShares(
  members: { userId: string; displayName: string }[],
  totalsByUserId: Record<string, number>,
): MemberTotal[] {
  const total = members.reduce((sum, m) => sum + (totalsByUserId[m.userId] ?? 0), 0);
  const shares = members.map((m, colorIndex) => {
    const amount = totalsByUserId[m.userId] ?? 0;
    return {
      userId: m.userId,
      displayName: m.displayName,
      amount,
      percent: total === 0 ? null : Math.round((amount / total) * 100),
      colorIndex,
    };
  });
  // 支払額の多い順。sort は安定なので、同額なら参加順のまま
  return shares.sort((x, y) => y.amount - x.amount);
}

// 表示中の月の、支払者ごとの支払額（FR-001: 記録した人ではなく支払者で数える）
export async function getMemberTotals(groupId: string, yearMonth: string): Promise<MemberTotal[]> {
  const [memberships, paid] = await Promise.all([
    prisma.groupMember.findMany({
      where: { groupId },
      orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
      include: { user: { select: { id: true, displayName: true } } },
    }),
    prisma.expenseRecord.groupBy({
      by: ["paidById"],
      where: { groupId, spentOn: { gte: `${yearMonth}-01`, lte: `${yearMonth}-31` } },
      _sum: { amount: true },
    }),
  ]);

  const totalsByUserId = Object.fromEntries(paid.map((row) => [row.paidById, row._sum.amount ?? 0]));
  return computeMemberShares(
    memberships.map((m) => ({ userId: m.user.id, displayName: m.user.displayName })),
    totalsByUserId,
  );
}
