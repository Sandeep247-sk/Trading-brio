import { prisma } from "@/lib/prisma";

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
   */
  static async getEquityCurve(userId: string, accountId: string): Promise<EquityPoint[]> {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) return [];

    const trades = await prisma.trade.findMany({
      where: { accountId, deletedAt: null },
      orderBy: { date: "asc" },
      select: { date: true, pnl: true },
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
   */
  static async getMonthlyPnl(userId: string, accountId: string): Promise<MonthlyPnl[]> {
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
   */
  static async getPairPerformance(userId: string, accountId: string): Promise<PairPerformance[]> {
    const trades = await prisma.trade.findMany({
      where: { accountId, deletedAt: null, account: { userId } },
      select: { pair: true, pnl: true, result: true, rrAchieved: true },
    });

    const pairMap = new Map<string, { trades: number; wins: number; losses: number; totalPnl: number; rrList: number[] }>();

    trades.forEach((t) => {
      if (!pairMap.has(t.pair)) {
        pairMap.set(t.pair, { trades: 0, wins: 0, losses: 0, totalPnl: 0, rrList: [] });
      }
      const entry = pairMap.get(t.pair)!;
      entry.trades++;
      const pnl = t.pnl ? Number(t.pnl) : 0;
      entry.totalPnl += pnl;
      if (t.result === "WIN") entry.wins++;
      else if (t.result === "LOSS") entry.losses++;
      if (t.rrAchieved !== null) entry.rrList.push(Number(t.rrAchieved));
    });

    return Array.from(pairMap.entries())
      .map(([pair, data]) => ({
        pair,
        trades: data.trades,
        wins: data.wins,
        losses: data.losses,
        winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
        netPnl: data.totalPnl,
        avgRR: data.rrList.length > 0 ? data.rrList.reduce((s, r) => s + r, 0) / data.rrList.length : 0,
      }))
      .sort((a, b) => b.trades - a.trades);
  }

  /**
   * Get session distribution data.
   */
  static async getSessionDistribution(userId: string, accountId: string): Promise<SessionDistribution[]> {
    const trades = await prisma.trade.findMany({
      where: { accountId, deletedAt: null, account: { userId } },
      select: { session: true, pnl: true, result: true },
    });

    const totalTrades = trades.length;
    const sessionMap: Record<string, { trades: number; wins: number; pnl: number }> = {
      LONDON: { trades: 0, wins: 0, pnl: 0 },
      NEW_YORK: { trades: 0, wins: 0, pnl: 0 },
      ASIAN: { trades: 0, wins: 0, pnl: 0 },
    };

    trades.forEach((t) => {
      const sess = sessionMap[t.session];
      if (sess) {
        sess.trades++;
        sess.pnl += t.pnl ? Number(t.pnl) : 0;
        if (t.result === "WIN") sess.wins++;
      }
    });

    return Object.entries(sessionMap).map(([session, data]) => ({
      session: session.replace(/_/g, " "),
      trades: data.trades,
      wins: data.wins,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      pnl: data.pnl,
      percentage: totalTrades > 0 ? (data.trades / totalTrades) * 100 : 0,
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
