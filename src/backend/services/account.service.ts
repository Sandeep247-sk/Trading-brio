import { prisma } from "@/lib/prisma";
import { CreateAccountInput, UpdateAccountInput } from "@/lib/validations/account";
import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

export class AccountService {
  /**
   * List all accounts for a specific user.
   */
  static async getAccounts(userId: string) {
    return prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
  
  /**
   * Get specific account details.
   * NOTE: No longer includes all trades — use getAccountMetrics() for metrics.
   */
  static async getAccountById(userId: string, accountId: string) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    return account;
  }

  /**
   * Create a new trading account.
   */
  static async createAccount(userId: string, input: CreateAccountInput) {
    return prisma.$transaction(async (tx) => {
      // If this is the default account, unset isDefault for other accounts
      if (input.isDefault) {
        await tx.account.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // Check if there are any accounts; if none, make this default anyway
      const count = await tx.account.count({ where: { userId } });
      const isDefault = count === 0 ? true : !!input.isDefault;

      const account = await tx.account.create({
        data: {
          userId,
          name: input.name,
          brokerName: input.brokerName,
          accountType: input.accountType,
          platform: input.platform,
          accountNumber: input.accountNumber,
          startingBalance: new Prisma.Decimal(input.startingBalance),
          currentBalance: new Prisma.Decimal(input.startingBalance), // starting balance initially
          currency: input.currency,
          isDefault,
          maxRiskPerTrade: input.maxRiskPerTrade ? new Prisma.Decimal(input.maxRiskPerTrade) : null,
          maxDailyDrawdown: input.maxDailyDrawdown ? new Prisma.Decimal(input.maxDailyDrawdown) : null,
          maxWeeklyDrawdown: input.maxWeeklyDrawdown ? new Prisma.Decimal(input.maxWeeklyDrawdown) : null,
          maxOverallDrawdown: input.maxOverallDrawdown ? new Prisma.Decimal(input.maxOverallDrawdown) : null,
          maxTradesPerDay: input.maxTradesPerDay,
        },
      });

      return account;
    });
  }

  /**
   * Update an existing account configuration.
   */
  static async updateAccount(userId: string, accountId: string, input: UpdateAccountInput) {
    // Check ownership (lightweight — no trade include)
    await this.getAccountById(userId, accountId);

    return prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.account.updateMany({
          where: { userId, isDefault: true, id: { not: accountId } },
          data: { isDefault: false },
        });
      }

      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.brokerName !== undefined) updateData.brokerName = input.brokerName;
      if (input.accountType !== undefined) updateData.accountType = input.accountType;
      if (input.platform !== undefined) updateData.platform = input.platform;
      if (input.accountNumber !== undefined) updateData.accountNumber = input.accountNumber;
      if (input.currency !== undefined) updateData.currency = input.currency;
      if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;

      if (input.startingBalance !== undefined) {
        updateData.startingBalance = new Prisma.Decimal(input.startingBalance);
      }

      // Risk Rules
      if (input.maxRiskPerTrade !== undefined) {
        updateData.maxRiskPerTrade = input.maxRiskPerTrade ? new Prisma.Decimal(input.maxRiskPerTrade) : null;
      }
      if (input.maxDailyDrawdown !== undefined) {
        updateData.maxDailyDrawdown = input.maxDailyDrawdown ? new Prisma.Decimal(input.maxDailyDrawdown) : null;
      }
      if (input.maxWeeklyDrawdown !== undefined) {
        updateData.maxWeeklyDrawdown = input.maxWeeklyDrawdown ? new Prisma.Decimal(input.maxWeeklyDrawdown) : null;
      }
      if (input.maxOverallDrawdown !== undefined) {
        updateData.maxOverallDrawdown = input.maxOverallDrawdown ? new Prisma.Decimal(input.maxOverallDrawdown) : null;
      }
      if (input.maxTradesPerDay !== undefined) {
        updateData.maxTradesPerDay = input.maxTradesPerDay;
      }

      const account = await tx.account.update({
        where: { id: accountId },
        data: updateData,
      });

      // Recalculate balance from trades
      await this.recalculateAccountBalance(tx, accountId);

      return account;
    });
  }

  /**
   * Recalculate Account current balance using SQL aggregate instead of fetching all trades.
   */
  private static async recalculateAccountBalance(tx: Prisma.TransactionClient, accountId: string) {
    const account = await tx.account.findUnique({
      where: { id: accountId },
    });
    if (!account) return;

    const result = await tx.trade.aggregate({
      where: { accountId, deletedAt: null },
      _sum: { pnl: true },
    });

    const totalPnl = Number(result._sum.pnl ?? 0);
    const newBalance = Number(account.startingBalance) + totalPnl;

    await tx.account.update({
      where: { id: accountId },
      data: { currentBalance: new Prisma.Decimal(newBalance) },
    });
  }

  /**
   * Delete account and related trades.
   */
  static async deleteAccount(userId: string, accountId: string) {
    const account = await this.getAccountById(userId, accountId);

    // Don't allow deleting the default account if other accounts exist
    if (account.isDefault) {
      const otherAccount = await prisma.account.findFirst({
        where: { userId, id: { not: accountId } },
      });
      if (otherAccount) {
        // Make the other account default first
        await prisma.account.update({
          where: { id: otherAccount.id },
          data: { isDefault: true },
        });
      }
    }

    await prisma.account.delete({
      where: { id: accountId },
    });
  }

  /**
   * Get full performance metrics and drawdown calculations for a selected account.
   * OPTIMIZED: Uses SQL aggregates + groupBy instead of fetching all trades into memory.
   */
  static async getAccountMetrics(userId: string, accountId: string) {
    return this._getAccountMetricsCached(userId, accountId);
  }

  /**
   * Cached version of account metrics. Revalidates every 60 seconds,
   * or immediately when trades are created/updated/deleted via revalidateTag.
   */
  private static _getAccountMetricsCached = (userId: string, accountId: string) => {
    const fn = unstable_cache(
      async () => {
        return AccountService._computeAccountMetrics(userId, accountId);
      },
      [`account-metrics-${accountId}`],
      { revalidate: 60, tags: [`account-${accountId}`] }
    );
    return fn();
  };

  /**
   * Core metrics computation using SQL aggregates.
   */
  private static async _computeAccountMetrics(userId: string, accountId: string) {
    // Date boundaries for drawdown calculations
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const today = new Date();
    const dayOfWeek = today.getUTCDay(); // 0 is Sunday
    const weekStart = new Date(today);
    weekStart.setUTCDate(today.getUTCDate() - dayOfWeek);
    weekStart.setUTCHours(0, 0, 0, 0);

    const baseWhere = { accountId, deletedAt: null as null };

    // Run all queries in parallel — this is the critical optimization
    const [
      account,
      totalAgg,
      profitAgg,
      lossAgg,
      winCount,
      lossCount,
      breakevenCount,
      rrAgg,
      sessionGrouped,
      tradesToday,
      tradesThisWeek,
    ] = await Promise.all([
      // 1. Account info (lightweight, no trades)
      prisma.account.findFirst({ where: { id: accountId, userId } }),

      // 2. Total aggregate: count, sum(pnl), max(pnl), min(pnl)
      prisma.trade.aggregate({
        where: baseWhere,
        _count: { _all: true },
        _sum: { pnl: true },
      }),

      // 3. Sum of profitable trades only
      prisma.trade.aggregate({
        where: { ...baseWhere, pnl: { gt: 0 } },
        _sum: { pnl: true },
        _max: { pnl: true },
      }),

      // 4. Sum of losing trades only
      prisma.trade.aggregate({
        where: { ...baseWhere, pnl: { lt: 0 } },
        _sum: { pnl: true },
        _min: { pnl: true },
      }),

      // 5. Win count
      prisma.trade.count({ where: { ...baseWhere, result: "WIN" } }),

      // 6. Loss count
      prisma.trade.count({ where: { ...baseWhere, result: "LOSS" } }),

      // 7. Breakeven count
      prisma.trade.count({ where: { ...baseWhere, result: "BREAKEVEN" } }),

      // 8. Average RR
      prisma.trade.aggregate({
        where: { ...baseWhere, rrAchieved: { not: null } },
        _avg: { rrAchieved: true },
      }),

      // 9. Session stats via groupBy
      prisma.trade.groupBy({
        by: ["session", "result"],
        where: baseWhere,
        _count: { _all: true },
        _sum: { pnl: true },
      }),

      // 10. Today's trades for daily drawdown (typically 0–5 rows)
      prisma.trade.findMany({
        where: { ...baseWhere, date: { gte: todayStart } },
        select: { pnl: true, date: true },
        orderBy: { date: "asc" },
      }),

      // 11. This week's trades for weekly drawdown (typically 0–25 rows)
      prisma.trade.findMany({
        where: { ...baseWhere, date: { gte: weekStart } },
        select: { pnl: true, date: true },
        orderBy: { date: "asc" },
      }),
    ]);

    if (!account) {
      throw new Error("Account not found");
    }

    const startingBalance = Number(account.startingBalance);
    const currentBalance = Number(account.currentBalance);
    const netProfit = currentBalance - startingBalance;
    const growthPercent = startingBalance > 0 ? (netProfit / startingBalance) * 100 : 0;

    const totalTrades = totalAgg._count._all;
    const totalProfit = Number(profitAgg._sum.pnl ?? 0);
    const totalLoss = Number(lossAgg._sum.pnl ?? 0);
    const bestTrade = Number(profitAgg._max.pnl ?? 0);
    const worstTrade = Number(lossAgg._min.pnl ?? 0);
    const averageRR = Number(rrAgg._avg.rrAchieved ?? 0);

    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
    const lossRate = totalTrades > 0 ? (lossCount / totalTrades) * 100 : 0;
    const profitFactor = Math.abs(totalLoss) > 0
      ? totalProfit / Math.abs(totalLoss)
      : totalProfit > 0 ? Infinity : 0;

    // Build session stats from groupBy results
    const sessionStats: Record<string, { trades: number; wins: number; pnl: number }> = {
      LONDON: { trades: 0, wins: 0, pnl: 0 },
      NEW_YORK: { trades: 0, wins: 0, pnl: 0 },
      ASIAN: { trades: 0, wins: 0, pnl: 0 },
    };

    for (const row of sessionGrouped) {
      const sess = row.session;
      if (sessionStats[sess]) {
        sessionStats[sess].trades += row._count._all;
        sessionStats[sess].pnl += Number(row._sum.pnl ?? 0);
        if (row.result === "WIN") {
          sessionStats[sess].wins += row._count._all;
        }
      }
    }

    // Daily Drawdown — simulate balance trajectory with today's (small) trade set
    let dailyStartBalance = currentBalance - tradesToday.reduce((sum, t) => sum + (t.pnl ? Number(t.pnl) : 0), 0);
    let lowestBalanceToday = dailyStartBalance;
    let runningBalanceToday = dailyStartBalance;
    tradesToday.forEach((t) => {
      runningBalanceToday += t.pnl ? Number(t.pnl) : 0;
      if (runningBalanceToday < lowestBalanceToday) {
        lowestBalanceToday = runningBalanceToday;
      }
    });
    const dailyDrawdownAmt = Math.max(0, dailyStartBalance - lowestBalanceToday);
    const dailyDrawdownPercent = dailyStartBalance > 0 ? (dailyDrawdownAmt / dailyStartBalance) * 100 : 0;

    // Weekly Drawdown
    let weeklyStartBalance = currentBalance - tradesThisWeek.reduce((sum, t) => sum + (t.pnl ? Number(t.pnl) : 0), 0);
    let lowestBalanceWeekly = weeklyStartBalance;
    let runningBalanceWeekly = weeklyStartBalance;
    tradesThisWeek.forEach((t) => {
      runningBalanceWeekly += t.pnl ? Number(t.pnl) : 0;
      if (runningBalanceWeekly < lowestBalanceWeekly) {
        lowestBalanceWeekly = runningBalanceWeekly;
      }
    });
    const weeklyDrawdownAmt = Math.max(0, weeklyStartBalance - lowestBalanceWeekly);
    const weeklyDrawdownPercent = weeklyStartBalance > 0 ? (weeklyDrawdownAmt / weeklyStartBalance) * 100 : 0;

    // Overall Drawdown (from starting balance)
    const overallDrawdownAmt = Math.max(0, startingBalance - currentBalance);
    const overallDrawdownPercent = startingBalance > 0 ? (overallDrawdownAmt / startingBalance) * 100 : 0;

    // Best / Worst Session
    let bestSessionName = "N/A";
    let worstSessionName = "N/A";
    let bestSessionPnl = -Infinity;
    let worstSessionPnl = Infinity;

    Object.entries(sessionStats).forEach(([sess, data]) => {
      if (data.trades > 0) {
        if (data.pnl > bestSessionPnl) {
          bestSessionPnl = data.pnl;
          bestSessionName = sess;
        }
        if (data.pnl < worstSessionPnl) {
          worstSessionPnl = data.pnl;
          worstSessionName = sess;
        }
      }
    });

    if (bestSessionPnl === -Infinity) bestSessionPnl = 0;
    if (worstSessionPnl === Infinity) worstSessionPnl = 0;

    return {
      accountInfo: {
        id: account.id,
        name: account.name,
        brokerName: account.brokerName,
        accountType: account.accountType,
        platform: account.platform,
        accountNumber: account.accountNumber,
        currency: account.currency,
        startingBalance,
        currentBalance,
        netProfit,
        growthPercent,
        isDefault: account.isDefault,
        limits: {
          maxRiskPerTrade: account.maxRiskPerTrade ? Number(account.maxRiskPerTrade) : null,
          maxDailyDrawdown: account.maxDailyDrawdown ? Number(account.maxDailyDrawdown) : null,
          maxWeeklyDrawdown: account.maxWeeklyDrawdown ? Number(account.maxWeeklyDrawdown) : null,
          maxOverallDrawdown: account.maxOverallDrawdown ? Number(account.maxOverallDrawdown) : null,
          maxTradesPerDay: account.maxTradesPerDay,
        },
      },
      performance: {
        totalTrades,
        totalProfit,
        totalLoss,
        netProfit,
        winRate,
        lossRate,
        profitFactor,
        averageRR,
        bestTrade,
        worstTrade,
      },
      drawdown: {
        dailyDrawdownPercent,
        weeklyDrawdownPercent,
        overallDrawdownPercent,
        dailyDrawdownAmt,
        weeklyDrawdownAmt,
        overallDrawdownAmt,
      },
      sessionStats: {
        bestSessionName,
        bestSessionPnl,
        worstSessionName,
        worstSessionPnl,
        sessions: sessionStats,
      },
    };
  }
}
