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

export interface AnalyticsBundle {
  equityCurve: EquityPoint[];
  monthlyPnl: MonthlyPnl[];
  pairPerformance: PairPerformance[];
  sessionDistribution: SessionDistribution[];
  dailyPnl: DailyPnl[];
  pnlDistribution: TradeDistribution[];
}

const analyticsBundleCacheMap = new Map<string, ReturnType<typeof unstable_cache>>();

const getAnalyticsBundleCached = (userId: string, accountId: string) => {
  let cachedFn = analyticsBundleCacheMap.get(accountId);
  if (!cachedFn) {
    cachedFn = unstable_cache(
      async () => {
        // Validate account ownership exactly once
        const account = await prisma.account.findFirst({
          where: { id: accountId, userId },
          select: { id: true, startingBalance: true, createdAt: true },
        });
        if (!account) {
          return {
            equityCurve: [],
            monthlyPnl: [],
            pairPerformance: [],
            sessionDistribution: [],
            dailyPnl: [],
            pnlDistribution: [],
          };
        }

        const [
          equityCurve,
          monthlyPnl,
          pairPerformance,
          sessionDistribution,
          dailyPnl,
          pnlDistribution
        ] = await Promise.all([
          AnalyticsService._computeEquityCurve(account),
          AnalyticsService._computeMonthlyPnl(accountId),
          AnalyticsService._computePairPerformance(accountId),
          AnalyticsService._computeSessionDistribution(accountId),
          AnalyticsService._computeDailyPnl(accountId),
          AnalyticsService._computePnlDistribution(accountId),
        ]);

        return {
          equityCurve,
          monthlyPnl,
          pairPerformance,
          sessionDistribution,
          dailyPnl,
          pnlDistribution,
        };
      },
      [`analytics-bundle-${accountId}`],
      { revalidate: 60, tags: [`account-${accountId}`] }
    );
    analyticsBundleCacheMap.set(accountId, cachedFn);
  }
  return cachedFn() as Promise<AnalyticsBundle>;
};

export class AnalyticsService {
  /**
   * Retrieves cached bundle containing all performance metrics.
   */
  static async getAnalyticsBundle(userId: string, accountId: string): Promise<AnalyticsBundle> {
    return getAnalyticsBundleCached(userId, accountId);
  }

  /**
   * Generate equity curve data points for the selected account.
   */
  static async getEquityCurve(userId: string, accountId: string): Promise<EquityPoint[]> {
    const bundle = await this.getAnalyticsBundle(userId, accountId);
    return bundle.equityCurve;
  }

  public static async _computeEquityCurve(account: { id: string; startingBalance: any; createdAt: Date }): Promise<EquityPoint[]> {
    const trades = await prisma.trade.findMany({
      where: { accountId: account.id, deletedAt: null },
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
   */
  static async getMonthlyPnl(userId: string, accountId: string): Promise<MonthlyPnl[]> {
    const bundle = await this.getAnalyticsBundle(userId, accountId);
    return bundle.monthlyPnl;
  }

  public static async _computeMonthlyPnl(accountId: string): Promise<MonthlyPnl[]> {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT 
        TO_CHAR(date, 'YYYY-MM') as month,
        COUNT(*)::integer as trades,
        SUM(COALESCE(pnl, 0))::float as net,
        SUM(CASE WHEN pnl > 0 THEN COALESCE(pnl, 0) ELSE 0 END)::float as profit,
        SUM(CASE WHEN pnl < 0 THEN COALESCE(pnl, 0) ELSE 0 END)::float as loss
      FROM "trades"
      WHERE "accountId" = ${accountId} AND "deletedAt" IS NULL
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month ASC
    `;

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return rows.map((r) => {
      const [year, monthStr] = r.month.split("-");
      const monthIdx = parseInt(monthStr, 10) - 1;
      const label = `${monthNames[monthIdx]} ${year}`;
      return {
        month: r.month,
        label,
        profit: r.profit || 0,
        loss: r.loss || 0,
        net: r.net || 0,
        trades: r.trades || 0,
      };
    });
  }

  /**
   * Get performance statistics grouped by trading pair.
   */
  static async getPairPerformance(userId: string, accountId: string): Promise<PairPerformance[]> {
    const bundle = await this.getAnalyticsBundle(userId, accountId);
    return bundle.pairPerformance;
  }

  public static async _computePairPerformance(accountId: string): Promise<PairPerformance[]> {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT 
        pair,
        COUNT(*)::integer as trades,
        SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END)::integer as wins,
        SUM(CASE WHEN result = 'LOSS' THEN 1 ELSE 0 END)::integer as losses,
        COALESCE(SUM(pnl), 0)::float as "netPnl",
        COALESCE(AVG("rrAchieved"), 0)::float as "avgRR"
      FROM "trades"
      WHERE "accountId" = ${accountId} AND "deletedAt" IS NULL
      GROUP BY pair
      ORDER BY trades DESC
    `;

    return rows.map((r) => ({
      pair: r.pair,
      trades: r.trades || 0,
      wins: r.wins || 0,
      losses: r.losses || 0,
      winRate: r.trades > 0 ? (r.wins / r.trades) * 100 : 0,
      netPnl: r.netPnl || 0,
      avgRR: r.avgRR || 0,
    }));
  }

  /**
   * Get session distribution data.
   */
  static async getSessionDistribution(userId: string, accountId: string): Promise<SessionDistribution[]> {
    const bundle = await this.getAnalyticsBundle(userId, accountId);
    return bundle.sessionDistribution;
  }

  public static async _computeSessionDistribution(accountId: string): Promise<SessionDistribution[]> {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT 
        session::text as session,
        COUNT(*)::integer as trades,
        SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END)::integer as wins,
        COALESCE(SUM(pnl), 0)::float as pnl
      FROM "trades"
      WHERE "accountId" = ${accountId} AND "deletedAt" IS NULL
      GROUP BY session
    `;

    const totalCount = rows.reduce((sum, r) => sum + r.trades, 0);

    const sessionMap: Record<string, { trades: number; wins: number; pnl: number }> = {
      LONDON: { trades: 0, wins: 0, pnl: 0 },
      NEW_YORK: { trades: 0, wins: 0, pnl: 0 },
      ASIAN: { trades: 0, wins: 0, pnl: 0 },
    };

    rows.forEach((r) => {
      if (sessionMap[r.session]) {
        sessionMap[r.session] = {
          trades: r.trades,
          wins: r.wins,
          pnl: r.pnl,
        };
      }
    });

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
    const bundle = await this.getAnalyticsBundle(userId, accountId);
    return bundle.dailyPnl;
  }

  public static async _computeDailyPnl(accountId: string): Promise<DailyPnl[]> {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT 
        TO_CHAR(date, 'YYYY-MM-DD') as date_str,
        SUM(COALESCE(pnl, 0))::float as pnl,
        COUNT(*)::integer as trades
      FROM "trades"
      WHERE "accountId" = ${accountId} AND "deletedAt" IS NULL
      GROUP BY DATE(date), TO_CHAR(date, 'YYYY-MM-DD')
      ORDER BY date_str ASC
    `;

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return rows.map((r) => {
      const d = new Date(r.date_str);
      return {
        date: r.date_str,
        pnl: r.pnl,
        trades: r.trades,
        dayOfWeek: dayNames[d.getUTCDay()],
      };
    });
  }

  /**
   * Get P&L distribution histogram.
   */
  static async getPnlDistribution(userId: string, accountId: string): Promise<TradeDistribution[]> {
    const bundle = await this.getAnalyticsBundle(userId, accountId);
    return bundle.pnlDistribution;
  }

  public static async _computePnlDistribution(accountId: string): Promise<TradeDistribution[]> {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT 
        CASE 
          WHEN pnl < -500 THEN '< -$500'
          WHEN pnl >= -500 AND pnl < -200 THEN '-$500 to -$200'
          WHEN pnl >= -200 AND pnl < -50 THEN '-$200 to -$50'
          WHEN pnl >= -50 AND pnl < 0 THEN '-$50 to $0'
          WHEN pnl >= 0 AND pnl < 50 THEN '$0 to $50'
          WHEN pnl >= 50 AND pnl < 200 THEN '$50 to $200'
          WHEN pnl >= 200 AND pnl < 500 THEN '$200 to $500'
          ELSE '> $500'
        END as range,
        COUNT(*)::integer as count
      FROM "trades"
      WHERE "accountId" = ${accountId} AND "deletedAt" IS NULL AND pnl IS NOT NULL
      GROUP BY 
        CASE 
          WHEN pnl < -500 THEN '< -$500'
          WHEN pnl >= -500 AND pnl < -200 THEN '-$500 to -$200'
          WHEN pnl >= -200 AND pnl < -50 THEN '-$200 to -$50'
          WHEN pnl >= -50 AND pnl < 0 THEN '-$50 to $0'
          WHEN pnl >= 0 AND pnl < 50 THEN '$0 to $50'
          WHEN pnl >= 50 AND pnl < 200 THEN '$50 to $200'
          WHEN pnl >= 200 AND pnl < 500 THEN '$200 to $500'
          ELSE '> $500'
        END
    `;

    const countsMap = new Map<string, number>();
    rows.forEach((r) => {
      countsMap.set(r.range, r.count);
    });

    const ranges = [
      "< -$500",
      "-$500 to -$200",
      "-$200 to -$50",
      "-$50 to $0",
      "$0 to $50",
      "$50 to $200",
      "$200 to $500",
      "> $500",
    ];

    return ranges.map((r) => ({
      range: r,
      count: countsMap.get(r) ?? 0,
    }));
  }
}
