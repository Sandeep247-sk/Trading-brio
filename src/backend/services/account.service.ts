import { prisma } from "@/lib/prisma";
import { CreateAccountInput, UpdateAccountInput } from "@/lib/validations/account";
import { Prisma } from "@prisma/client";
import { unstable_cache, revalidateTag } from "next/cache";

const accountMetricsCacheMap = new Map<string, ReturnType<typeof unstable_cache>>();

const getAccountMetricsCached = (userId: string, accountId: string) => {
  let cachedFn = accountMetricsCacheMap.get(accountId);
  if (!cachedFn) {
    cachedFn = unstable_cache(
      async () => {
        return AccountService._computeAccountMetrics(userId, accountId);
      },
      [`account-metrics-${accountId}`],
      { revalidate: 60, tags: [`account-${accountId}`] }
    );
    accountMetricsCacheMap.set(accountId, cachedFn);
  }
  return cachedFn();
};

export class AccountService {
  /**
   * List all accounts for a specific user.
   */
  static async getAccounts(userId: string) {
    return prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        phases: {
          orderBy: { phaseNumber: "asc" },
        },
      },
    });
  }
  
  /**
   * Get specific account details.
   */
  static async getAccountById(userId: string, accountId: string) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      include: {
        phases: {
          orderBy: { phaseNumber: "asc" },
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
          maxOverallDrawdown: input.maxOverallDrawdown ? new Prisma.Decimal(input.maxOverallDrawdown) : null,
          maxTradesPerDay: input.maxTradesPerDay,
          challengeName: input.challengeName || null,
          phasesCount: input.phasesCount || null,
          fundedSince: input.fundedSince ? new Date(input.fundedSince) : null,
          profitSplit: input.profitSplit ? new Prisma.Decimal(input.profitSplit) : null,
          challengeStatus: input.challengeStatus || "ACTIVE",
          isCompleted: false,
        },
      });

      if (input.accountType === "PROP_CHALLENGE" && input.phases && input.phases.length > 0) {
        await tx.challengePhase.createMany({
          data: input.phases.map((p) => ({
            accountId: account.id,
            phaseNumber: p.phaseNumber,
            phaseName: p.phaseName,
            profitTarget: new Prisma.Decimal(p.profitTarget),
            dailyDrawdownLimit: new Prisma.Decimal(p.dailyDrawdownLimit),
            maxDrawdownLimit: new Prisma.Decimal(p.maxDrawdownLimit),
            completed: false,
            celebrated: false,
          })),
        });
      }

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
      if (input.maxOverallDrawdown !== undefined) {
        updateData.maxOverallDrawdown = input.maxOverallDrawdown ? new Prisma.Decimal(input.maxOverallDrawdown) : null;
      }
      if (input.maxTradesPerDay !== undefined) {
        updateData.maxTradesPerDay = input.maxTradesPerDay;
      }

      // Challenge fields
      if (input.challengeName !== undefined) updateData.challengeName = input.challengeName;
      if (input.phasesCount !== undefined) updateData.phasesCount = input.phasesCount;
      if (input.fundedSince !== undefined) updateData.fundedSince = input.fundedSince ? new Date(input.fundedSince) : null;
      if (input.profitSplit !== undefined) updateData.profitSplit = input.profitSplit ? new Prisma.Decimal(input.profitSplit) : null;
      if (input.challengeStatus !== undefined) updateData.challengeStatus = input.challengeStatus;

      const account = await tx.account.update({
        where: { id: accountId },
        data: updateData,
      });

      // Update phases if specified
      if (input.accountType === "PROP_CHALLENGE" && input.phases) {
        // Delete old phases
        await tx.challengePhase.deleteMany({
          where: { accountId },
        });
        // Create new phases
        await tx.challengePhase.createMany({
          data: input.phases.map((p) => ({
            accountId: accountId,
            phaseNumber: p.phaseNumber,
            phaseName: p.phaseName,
            profitTarget: new Prisma.Decimal(p.profitTarget),
            dailyDrawdownLimit: new Prisma.Decimal(p.dailyDrawdownLimit),
            maxDrawdownLimit: new Prisma.Decimal(p.maxDrawdownLimit),
            completed: false,
            celebrated: false,
          })),
        });
      }

      // Recalculate balance from trades
      await this.recalculateAccountBalance(tx, accountId);

      // Evaluate rules
      await this.evaluateChallengeRules(tx, accountId);

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
   */
  static async getAccountMetrics(userId: string, accountId: string) {
    return getAccountMetricsCached(userId, accountId);
  }

  /**
   * Core metrics computation using SQL aggregates.
   */
  public static async _computeAccountMetrics(userId: string, accountId: string) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const baseWhere = { accountId, deletedAt: null as null };

    // Run queries in parallel
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
    ] = await Promise.all([
      prisma.account.findFirst({
        where: { id: accountId, userId },
        include: {
          phases: {
            orderBy: { phaseNumber: "asc" },
          },
        },
      }),
      prisma.trade.aggregate({
        where: baseWhere,
        _count: { _all: true },
        _sum: { pnl: true },
      }),
      prisma.trade.aggregate({
        where: { ...baseWhere, pnl: { gt: 0 } },
        _sum: { pnl: true },
        _max: { pnl: true },
      }),
      prisma.trade.aggregate({
        where: { ...baseWhere, pnl: { lt: 0 } },
        _sum: { pnl: true },
        _min: { pnl: true },
      }),
      prisma.trade.count({ where: { ...baseWhere, result: "WIN" } }),
      prisma.trade.count({ where: { ...baseWhere, result: "LOSS" } }),
      prisma.trade.count({ where: { ...baseWhere, result: "BREAKEVEN" } }),
      prisma.trade.aggregate({
        where: { ...baseWhere, rrAchieved: { not: null } },
        _avg: { rrAchieved: true },
      }),
      prisma.trade.groupBy({
        by: ["session", "result"],
        where: baseWhere,
        _count: { _all: true },
        _sum: { pnl: true },
      }),
      prisma.trade.findMany({
        where: { ...baseWhere, date: { gte: todayStart } },
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

    // Session stats
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

    // Daily Drawdown
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

    // Overall Drawdown
    const overallDrawdownAmt = Math.max(0, startingBalance - currentBalance);
    const overallDrawdownPercent = startingBalance > 0 ? (overallDrawdownAmt / startingBalance) * 100 : 0;

    // Prop Challenge progression and target details
    const activePhase = account.phases.find((p) => !p.completed);
    const currentPhaseNumber = activePhase ? activePhase.phaseNumber : (account.phasesCount || 1);
    const currentPhaseTargetPercent = activePhase ? Number(activePhase.profitTarget) : 0;
    
    // Remaining profit target
    const currentProfitPercent = growthPercent;
    const remainingTargetPercent = Math.max(0, currentPhaseTargetPercent - currentProfitPercent);
    const progressPercent = currentPhaseTargetPercent > 0
      ? Math.min(100, Math.max(0, (currentProfitPercent / currentPhaseTargetPercent) * 100))
      : 0;

    // Pass probability estimation formula
    let passProbability = 50; // base probability
    if (totalTrades >= 5) {
      const expectancy = (winRate / 100) * averageRR - ((100 - winRate) / 100);
      if (expectancy > 0) {
        passProbability = Math.min(98, 50 + expectancy * 15);
      } else {
        passProbability = Math.max(5, 50 + expectancy * 20);
      }
    }

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
        challengeName: account.challengeName,
        phasesCount: account.phasesCount,
        fundedSince: account.fundedSince ? account.fundedSince.toISOString() : null,
        profitSplit: account.profitSplit ? Number(account.profitSplit) : null,
        challengeStatus: account.challengeStatus,
        isCompleted: account.isCompleted,
        completedAt: account.completedAt ? account.completedAt.toISOString() : null,
        phases: account.phases.map((p) => ({
          id: p.id,
          phaseNumber: p.phaseNumber,
          phaseName: p.phaseName,
          profitTarget: Number(p.profitTarget),
          dailyDrawdownLimit: Number(p.dailyDrawdownLimit),
          maxDrawdownLimit: Number(p.maxDrawdownLimit),
          completed: p.completed,
          completedAt: p.completedAt ? p.completedAt.toISOString() : null,
          celebrated: p.celebrated,
        })),
        currentPhaseNumber,
        currentPhaseTargetPercent,
        currentProfitPercent,
        remainingTargetPercent,
        progressPercent,
        passProbability,
        limits: {
          maxRiskPerTrade: account.maxRiskPerTrade ? Number(account.maxRiskPerTrade) : null,
          maxDailyDrawdown: activePhase ? Number(activePhase.dailyDrawdownLimit) : (account.maxDailyDrawdown ? Number(account.maxDailyDrawdown) : null),
          maxOverallDrawdown: activePhase ? Number(activePhase.maxDrawdownLimit) : (account.maxOverallDrawdown ? Number(account.maxOverallDrawdown) : null),
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
        overallDrawdownPercent,
        dailyDrawdownAmt,
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

  /**
   * Evaluates the challenge status, detects drawdown breaches, and checks if a phase is completed.
   */
  static async evaluateChallengeRules(tx: Prisma.TransactionClient, accountId: string) {
    const account = await tx.account.findUnique({
      where: { id: accountId },
      include: {
        phases: {
          orderBy: { phaseNumber: "asc" },
        },
      },
    });

    if (!account) return;

    if (account.accountType !== "PROP_CHALLENGE") return;
    if (account.challengeStatus === "FAILED" || account.challengeStatus === "CHALLENGE_PASSED") return;

    const startingBalance = Number(account.startingBalance);
    const currentBalance = Number(account.currentBalance);
    const netProfit = currentBalance - startingBalance;
    const profitPercent = startingBalance > 0 ? (netProfit / startingBalance) * 100 : 0;

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const tradesToday = await tx.trade.findMany({
      where: { accountId, deletedAt: null, date: { gte: todayStart } },
      select: { pnl: true },
    });

    let dailyStartBalance = currentBalance - tradesToday.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
    let lowestBalanceToday = dailyStartBalance;
    let runningBalanceToday = dailyStartBalance;
    
    tradesToday.forEach((t) => {
      runningBalanceToday += Number(t.pnl || 0);
      if (runningBalanceToday < lowestBalanceToday) {
        lowestBalanceToday = runningBalanceToday;
      }
    });

    const dailyDrawdownAmt = Math.max(0, dailyStartBalance - lowestBalanceToday);
    const dailyDrawdownPercent = dailyStartBalance > 0 ? (dailyDrawdownAmt / dailyStartBalance) * 100 : 0;

    const overallDrawdownAmt = Math.max(0, startingBalance - currentBalance);
    const overallDrawdownPercent = startingBalance > 0 ? (overallDrawdownAmt / startingBalance) * 100 : 0;

    const activePhase = account.phases.find((p) => !p.completed);

    if (activePhase) {
      const dailyLimit = Number(activePhase.dailyDrawdownLimit);
      const maxLimit = Number(activePhase.maxDrawdownLimit);

      // Check Drawdown Limits Failures
      if (dailyDrawdownPercent >= dailyLimit || overallDrawdownPercent >= maxLimit) {
        await tx.account.update({
          where: { id: accountId },
          data: { challengeStatus: "FAILED" },
        });
        return;
      }

      // Check Profit Target Completion
      const targetPercent = Number(activePhase.profitTarget);
      if (profitPercent >= targetPercent) {
        await tx.challengePhase.update({
          where: { id: activePhase.id },
          data: {
            completed: true,
            completedAt: new Date(),
            celebrated: false,
          },
        });

        await tx.phaseCompletion.create({
          data: {
            phaseId: activePhase.id,
            completedAt: new Date(),
            startingBalance: account.startingBalance,
            endingBalance: account.currentBalance,
            profitAchieved: new Prisma.Decimal(netProfit),
          },
        });

        const remainingPhases = account.phases.filter((p) => p.id !== activePhase.id && !p.completed);
        const allCompleted = remainingPhases.length === 0;

        if (allCompleted) {
          await tx.account.update({
            where: { id: accountId },
            data: {
              challengeStatus: "CHALLENGE_PASSED",
              isCompleted: true,
              completedAt: new Date(),
            },
          });
        } else {
          await tx.account.update({
            where: { id: accountId },
            data: {
              challengeStatus: "READY_FOR_NEXT_PHASE",
            },
          });
        }
      }
    } else {
      const allPhasesCompleted = account.phases.length > 0 && account.phases.every((p) => p.completed);
      if (allPhasesCompleted && account.challengeStatus !== "CHALLENGE_PASSED") {
        await tx.account.update({
          where: { id: accountId },
          data: {
            challengeStatus: "CHALLENGE_PASSED",
            isCompleted: true,
            completedAt: new Date(),
          },
        });
      }
    }
  }
}
