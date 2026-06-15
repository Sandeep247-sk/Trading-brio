import { prisma } from "@/lib/prisma";
import { CreateAccountInput, UpdateAccountInput } from "@/lib/validations/account";
import { Prisma } from "@prisma/client";

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
   */
  static async getAccountById(userId: string, accountId: string) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      include: {
        trades: {
          where: { deletedAt: null },
          orderBy: { date: "asc" },
        },
      },
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
    // Check ownership
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
   * Recalculate Account current balance by adding all PnL of non-deleted trades to starting balance
   */
  private static async recalculateAccountBalance(tx: Prisma.TransactionClient, accountId: string) {
    const account = await tx.account.findUnique({
      where: { id: accountId },
    });
    if (!account) return;

    const trades = await tx.trade.findMany({
      where: { accountId, deletedAt: null },
      select: { pnl: true },
    });

    const totalPnl = trades.reduce((sum, trade) => sum + (trade.pnl ? Number(trade.pnl) : 0), 0);
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
   */
  static async getAccountMetrics(userId: string, accountId: string) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      include: {
        trades: {
          where: { deletedAt: null },
          orderBy: { date: "asc" },
        },
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    const startingBalance = Number(account.startingBalance);
    const currentBalance = Number(account.currentBalance);
    const netProfit = currentBalance - startingBalance;
    const growthPercent = startingBalance > 0 ? (netProfit / startingBalance) * 100 : 0;

    const trades = account.trades;
    const totalTrades = trades.length;

    let totalProfit = 0;
    let totalLoss = 0;
    let wins = 0;
    let losses = 0;
    let breakevens = 0;
    let bestTrade = 0;
    let worstTrade = 0;
    const rrList: number[] = [];

    // Session-specific stats helper
    const sessionStats: Record<string, { trades: number; wins: number; pnl: number }> = {
      LONDON: { trades: 0, wins: 0, pnl: 0 },
      NEW_YORK: { trades: 0, wins: 0, pnl: 0 },
      ASIAN: { trades: 0, wins: 0, pnl: 0 },
    };

    trades.forEach((t) => {
      const pnl = t.pnl ? Number(t.pnl) : 0;
      if (pnl > 0) {
        totalProfit += pnl;
        wins++;
        if (pnl > bestTrade) bestTrade = pnl;
      } else if (pnl < 0) {
        totalLoss += pnl;
        losses++;
        if (pnl < worstTrade) worstTrade = pnl;
      } else {
        breakevens++;
      }

      if (t.rrAchieved !== null) {
        rrList.push(Number(t.rrAchieved));
      }

      // Update session statistics
      const sess = t.session;
      if (sessionStats[sess]) {
        sessionStats[sess].trades++;
        sessionStats[sess].pnl += pnl;
        if (pnl > 0) {
          sessionStats[sess].wins++;
        }
      }
    });

    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const lossRate = totalTrades > 0 ? (losses / totalTrades) * 100 : 0;
    const profitFactor = Math.abs(totalLoss) > 0 ? totalProfit / Math.abs(totalLoss) : totalProfit > 0 ? Infinity : 0;
    const averageRR = rrList.length > 0 ? rrList.reduce((s, r) => s + r, 0) / rrList.length : 0;

    // Drawdowns Tracking
    // 1. Daily Drawdown (from start of today)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const tradesToday = trades.filter((t) => new Date(t.date) >= todayStart);
    let dailyStartBalance = currentBalance - tradesToday.reduce((sum, t) => sum + (t.pnl ? Number(t.pnl) : 0), 0);
    
    // Simulate balance trajectory today to find the lowest dip
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

    // 2. Weekly Drawdown (from start of current week)
    const today = new Date();
    const dayOfWeek = today.getUTCDay(); // 0 is Sunday
    const weekStart = new Date(today);
    weekStart.setUTCDate(today.getUTCDate() - dayOfWeek);
    weekStart.setUTCHours(0, 0, 0, 0);

    const tradesThisWeek = trades.filter((t) => new Date(t.date) >= weekStart);
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

    // 3. Overall Drawdown (from peak equity historically or from starting balance)
    // Prop firms often compute overall drawdown relative to initial starting balance
    const overallDrawdownAmt = Math.max(0, startingBalance - currentBalance);
    const overallDrawdownPercent = startingBalance > 0 ? (overallDrawdownAmt / startingBalance) * 100 : 0;

    // Best / Worst Session calculations
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
