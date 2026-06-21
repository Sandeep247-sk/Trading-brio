import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export interface EquityPoint {
  date: string;
  balance: number;
  pnl: number;
}

export interface MonthlyPnl {
  month: string;       // e.g., "2026-01"
  label: string;       // e.g., "Jan 2026"
  profit: number;
  loss: number;
  net: number;
  trades: number;
}

export interface PairPerformance {
  pair: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnl: number;
  avgRR: number;
}

export interface SessionDistribution {
  session: string;
  trades: number;
  wins: number;
  winRate: number;
  pnl: number;
  percentage: number;
}

export interface DailyPnl {
  date: string;
  dayOfWeek: string;
  pnl: number;
  trades: number;
}

export interface TradeDistribution {
  range: string;
  count: number;
}

export class AnalyticsService {
  /**
   * Generate equity curve data points for the selected account.
   * Each point represents the cumulative balance after each trade (chronologically).
   * Cached for 60 seconds with immediate invalidation on trade changes.
   */
  static async getEquityCurve(userId: string, accountId: string): Promise<EquityPoint[]> {
    const fn = unstable_cache(
      async () => AnalyticsService._computeEquityCurve(userId, accountId),
      [`equity-curve-${accountId}`],
      { revalidate: 60, tags: [`account-${accountId}`] }
    );
    return fn();
  }

  private static async _computeEquityCurve(userId: string, accountId: string): Promise<EquityPoint[]> {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) return [];

    const trades = await prisma.trade.findMany({
      where: { accountId, deletedAt: null },
      orderBy: { date: "asc" },
      select: { date: true, pnl: true },
      take: 300,
    });

    const startingBalance = Number(account.startingBalance);
    let runningBalance = startingBalance;

    const points: EquityPoint[] = [
      { date: new Date(account.createdAt).toISOString().split("T")[0], balance: startingBalance, pnl: 0 },
    ];

    trades.forEach((t) => {
      const pnl = t.pnl ? Number(t.pnl) : 0;
      runningBalance += pnl;
      points.push({
        date: new Date(t.date).toISOString().split("T")[0],
        balance: runningBalance,
        pnl,
      });
    });

    return points;
  }

  /**
   * Aggregate monthly P&L data.
   * Cached for 60 seconds.
   */
  static async getMonthlyPnl(userId: string, accountId: string): Promise<MonthlyPnl[]> {
    const fn = unstable_cache(
      async () => AnalyticsService._computeMonthlyPnl(userId, accountId),
      [`monthly-pnl-${accountId}`],
      { revalidate: 60, tags: [`account-${accountId}`] }
    );
    return fn();
  }

  private static async _computeMonthlyPnl(userId: string, accountId: string): Promise<MonthlyPnl[]> {
    const trades = await prisma.trade.findMany({
      where: { accountId, deletedAt: null, account: { userId } },
      orderBy: { date: "asc" },
      select: { date: true, pnl: true, result: true },
    });

    const monthMap = new Map<string, MonthlyPnl>();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    trades.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      const pnl = t.pnl ? Number(t.pnl) : 0;

      if (!monthMap.has(key)) {
        monthMap.set(key, { month: key, label, profit: 0, loss: 0, net: 0, trades: 0 });
      }

      const entry = monthMap.get(key)!;
      entry.trades++;
      entry.net += pnl;
      if (pnl > 0) entry.profit += pnl;
      else if (pnl < 0) entry.loss += pnl;
    });

    return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Get performance statistics grouped by trading pair.
   * OPTIMIZED: Uses Prisma groupBy for counts and sums, only fetches individual rows for avgRR.
   * Cached for 60 seconds.
   */
  static async getPairPerformance(userId: string, accountId: string): Promise<PairPerformance[]> {
    const fn = unstable_cache(
      async () => AnalyticsService._computePairPerformance(userId, accountId),
      [`pair-performance-${accountId}`],
      { revalidate: 60, tags: [`account-${accountId}`] }
    );
    return fn();
  }

  private static async _computePairPerformance(userId: string, accountId: string): Promise<PairPerformance[]> {
    const baseWhere = { accountId, deletedAt: null as null, account: { userId } };

    // Use groupBy for counts and sums — avoids fetching all trade rows
    const [pairGrouped, pairRR] = await Promise.all([
      prisma.trade.groupBy({
        by: ["pair", "result"],
        where: baseWhere,
        _count: { _all: true },
        _sum: { pnl: true },
      }),
      prisma.trade.groupBy({
        by: ["pair"],
        where: { ...baseWhere, rrAchieved: { not: null } },
        _avg: { rrAchieved: true },
      }),
    ]);

    // Build pair map from groupBy results
    const pairMap = new Map<string, { trades: number; wins: number; losses: number; totalPnl: number; avgRR: number }>();

    for (const row of pairGrouped) {
      if (!pairMap.has(row.pair)) {
        pairMap.set(row.pair, { trades: 0, wins: 0, losses: 0, totalPnl: 0, avgRR: 0 });
      }
      const entry = pairMap.get(row.pair)!;
      entry.trades += row._count._all;
      entry.totalPnl += Number(row._sum.pnl ?? 0);
      if (row.result === "WIN") entry.wins += row._count._all;
      else if (row.result === "LOSS") entry.losses += row._count._all;
    }

    // Add avgRR from the separate groupBy
    for (const row of pairRR) {
      const entry = pairMap.get(row.pair);
      if (entry) {
        entry.avgRR = Number(row._avg.rrAchieved ?? 0);
      }
    }

    return Array.from(pairMap.entries())
      .map(([pair, data]) => ({
        pair,
        trades: data.trades,
        wins: data.wins,
        losses: data.losses,
        winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
        netPnl: data.totalPnl,
        avgRR: data.avgRR,
      }))
      .sort((a, b) => b.trades - a.trades);
  }

  /**
   * Get session distribution data.
   * OPTIMIZED: Uses Prisma groupBy instead of fetching all trades.
   * Cached for 60 seconds.
   */
  static async getSessionDistribution(userId: string, accountId: string): Promise<SessionDistribution[]> {
    const fn = unstable_cache(
      async () => AnalyticsService._computeSessionDistribution(userId, accountId),
      [`session-distribution-${accountId}`],
      { revalidate: 60, tags: [`account-${accountId}`] }
    );
    return fn();
  }

  private static async _computeSessionDistribution(userId: string, accountId: string): Promise<SessionDistribution[]> {
    const baseWhere = { accountId, deletedAt: null as null, account: { userId } };

    const [sessionGrouped, totalCount] = await Promise.all([
      prisma.trade.groupBy({
        by: ["session", "result"],
        where: baseWhere,
        _count: { _all: true },
        _sum: { pnl: true },
      }),
      prisma.trade.count({ where: baseWhere }),
    ]);

    const sessionMap: Record<string, { trades: number; wins: number; pnl: number }> = {
      LONDON: { trades: 0, wins: 0, pnl: 0 },
      NEW_YORK: { trades: 0, wins: 0, pnl: 0 },
      ASIAN: { trades: 0, wins: 0, pnl: 0 },
    };

    for (const row of sessionGrouped) {
      const sess = sessionMap[row.session];
      if (sess) {
        sess.trades += row._count._all;
        sess.pnl += Number(row._sum.pnl ?? 0);
        if (row.result === "WIN") sess.wins += row._count._all;
      }
    }

    return Object.entries(sessionMap).map(([session, data]) => ({
      session: session.replace(/_/g, " "),
      trades: data.trades,
      wins: data.wins,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      pnl: data.pnl,
      percentage: totalCount > 0 ? (data.trades / totalCount) * 100 : 0,
    }));
  }

  /**
   * Get daily P&L breakdown with day-of-week info.
   */
  static async getDailyPnl(userId: string, accountId: string): Promise<DailyPnl[]> {
    const trades = await prisma.trade.findMany({
      where: { accountId, deletedAt: null, account: { userId } },
      orderBy: { date: "asc" },
      select: { date: true, pnl: true },
    });

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayMap = new Map<string, { pnl: number; trades: number; dayOfWeek: string }>();

    trades.forEach((t) => {
      const d = new Date(t.date);
      const key = d.toISOString().split("T")[0];
      const pnl = t.pnl ? Number(t.pnl) : 0;

      if (!dayMap.has(key)) {
        dayMap.set(key, { pnl: 0, trades: 0, dayOfWeek: dayNames[d.getDay()] });
      }
      const entry = dayMap.get(key)!;
      entry.pnl += pnl;
      entry.trades++;
    });

    return Array.from(dayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get P&L distribution histogram.
   */
  static async getPnlDistribution(userId: string, accountId: string): Promise<TradeDistribution[]> {
    const trades = await prisma.trade.findMany({
      where: { accountId, deletedAt: null, account: { userId }, pnl: { not: null } },
      select: { pnl: true },
    });

    const ranges = [
      { range: "< -$500", min: -Infinity, max: -500 },
      { range: "-$500 to -$200", min: -500, max: -200 },
      { range: "-$200 to -$50", min: -200, max: -50 },
      { range: "-$50 to $0", min: -50, max: 0 },
      { range: "$0 to $50", min: 0, max: 50 },
      { range: "$50 to $200", min: 50, max: 200 },
      { range: "$200 to $500", min: 200, max: 500 },
      { range: "> $500", min: 500, max: Infinity },
    ];

    return ranges.map((r) => ({
      range: r.range,
      count: trades.filter((t) => {
        const pnl = Number(t.pnl);
        return pnl >= r.min && pnl < r.max;
      }).length,
    }));
  }
}
