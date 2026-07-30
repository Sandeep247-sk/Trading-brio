import { prisma } from "@/lib/prisma";
import { Direction, TradeResult, TradingSession } from "@prisma/client";
import { CreateTradeInput, UpdateTradeInput } from "@/lib/validations/trade";
import { revalidateTag } from "next/cache";
import { AccountService } from "./account.service";

export interface TradeFilters {
  pair?: string;
  session?: TradingSession;
  direction?: Direction;
  result?: TradeResult;
  strategyId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export class TradeService {
  /**
   * Helper to ensure user has a default account and returns it.
   */
  public static async getOrCreateUserAccount(userId: string, accountId?: string | null) {
    if (accountId) {
      const account = await prisma.account.findFirst({
        where: { id: accountId, userId },
      });
      if (account) return account;
    }

  let account = await prisma.account.findFirst({
  where: { userId },
  orderBy: {
    isDefault: "desc",
  },
});

    if (!account) {
      account = await prisma.account.create({
        data: {
          userId,
          name: "Main Account",
          startingBalance: 0,
          currentBalance: 0,
          currency: "USD",
          isDefault: true,
        },
      });
    }

    return account;
  }

  /**
   * Retrieves list of trades with pagination and filters.
   */
  static async getTrades(
    userId: string,
    filters: TradeFilters = {},
    pagination: PaginationParams = {},
    accountId?: string | null
  ) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const skip = (page - 1) * limit;

    const account = await this.getOrCreateUserAccount(userId, accountId);

    const whereClause: any = {
      accountId: account.id,
      deletedAt: null,
    };

    if (filters.pair) {
      whereClause.pair = filters.pair;
    }
    if (filters.session) {
      whereClause.session = filters.session;
    }
    if (filters.direction) {
      whereClause.direction = filters.direction;
    }
    if (filters.result) {
      whereClause.result = filters.result;
    }
    if (filters.strategyId) {
      whereClause.strategyVersion = {
        strategyId: filters.strategyId,
      };
    }
    if (filters.startDate || filters.endDate) {
      whereClause.date = {};
      if (filters.startDate) {
        whereClause.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        whereClause.date.lte = new Date(filters.endDate);
      }
    }

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where: whereClause,
        select: {
          id: true,
          pair: true,
          date: true,
          result: true,
          pnl: true,
          session: true,
          direction: true,
          riskPercent: true,
          rrAchieved: true,
          strategyVersion: {
            select: {
              id: true,
              strategy: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          date: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.trade.count({
        where: whereClause,
      }),
    ]);

    return {
      trades,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves a single trade and verifies ownership.
   */
  static async getTradeById(userId: string, tradeId: string) {
    const trade = await prisma.trade.findFirst({
      where: {
        id: tradeId,
        deletedAt: null,
      },
      include: {
        images: true,
        analyses: true,
        violations: {
          include: {
            category: true,
          },
        },
        strategyVersion: {
          include: {
            strategy: true,
            rules: {
              orderBy: {
                order: "asc",
              },
            },
          },
        },
        account: true,
      },
    });

    if (!trade) {
      throw new Error("Trade not found");
    }

    if (trade.account.userId !== userId) {
      throw new Error("Unauthorized access to this trade");
    }

    return trade;
  }

  /**
   * Creates a new trade record and adjusts account balance.
   */
  static async createTrade(userId: string, input: CreateTradeInput) {
    const account = await this.getOrCreateUserAccount(userId, input.accountId);

    // Calculate Planned RR
    const entry = Number(input.entryPrice);
    const sl = Number(input.stopLoss);
    const tp = Number(input.takeProfit);
    const riskAmt = Math.abs(entry - sl);
    const targetAmt = Math.abs(tp - entry);
    const plannedRR = riskAmt > 0 ? targetAmt / riskAmt : 0;

    // Default RR Achieved if win/loss/breakeven
    let rrAchieved = input.rrAchieved !== undefined ? input.rrAchieved : null;
    if (rrAchieved === null && input.result) {
      if (input.result === "WIN") {
        rrAchieved = plannedRR;
      } else if (input.result === "LOSS") {
        rrAchieved = -1.0;
      } else if (input.result === "BREAKEVEN") {
        rrAchieved = 0;
      }
    }

    let tradePnl = input.pnl !== undefined ? input.pnl : null;
    const resolvedResult = input.result || null;
    
    // Normalize signs
    if (resolvedResult) {
      if (resolvedResult === "LOSS") {
        if (tradePnl !== null && tradePnl > 0) {
          tradePnl = -tradePnl;
        }
        if (rrAchieved !== null && rrAchieved > 0) {
          rrAchieved = -rrAchieved;
        }
      } else if (resolvedResult === "WIN") {
        if (tradePnl !== null && tradePnl < 0) {
          tradePnl = Math.abs(tradePnl);
        }
        if (rrAchieved !== null && rrAchieved < 0) {
          rrAchieved = Math.abs(rrAchieved);
        }
      }
    }

    const trade = await prisma.$transaction(async (tx) => {
      const newTrade = await tx.trade.create({
        data: {
          accountId: account.id,
          pair: input.pair,
          date: new Date(input.date),
          session: input.session,
          direction: input.direction,
          entryPrice: input.entryPrice,
          stopLoss: input.stopLoss,
          takeProfit: input.takeProfit,
          riskPercent: input.riskPercent,
          result: input.result || null,
          rrAchieved: rrAchieved,
          pnl: tradePnl,
          notes: input.notes || null,
          strategyVersionId: input.strategyVersionId || null,
        },
      });

      // Update account balance
      if (tradePnl !== null && tradePnl !== 0) {
        await tx.account.update({
          where: { id: account.id },
          data: {
            currentBalance: {
              increment: tradePnl,
            },
          },
        });
      }

      // Evaluate challenge rules
      await AccountService.evaluateChallengeRules(tx, account.id);

      // Log audit action
      await tx.auditLog.create({
        data: {
          userId,
          action: "CREATE",
          entity: "trade",
          entityId: newTrade.id,
          details: { pair: input.pair, result: input.result, pnl: tradePnl },
        },
      });

      return newTrade;
    });

    // Invalidate cached metrics for this account
    revalidateTag(`account-${account.id}`, "max");

    return trade;
  }

  /**
   * Updates an existing trade and balance difference.
   */
  static async updateTrade(userId: string, tradeId: string, input: UpdateTradeInput) {
    const existingTrade = await this.getTradeById(userId, tradeId);

    const finalResult = input.result !== undefined ? input.result : existingTrade.result;
    
    let finalPnl = input.pnl !== undefined 
      ? (input.pnl !== null ? Number(input.pnl) : null) 
      : (existingTrade.pnl ? Number(existingTrade.pnl) : null);
      
    let finalRr = input.rrAchieved !== undefined 
      ? (input.rrAchieved !== null ? Number(input.rrAchieved) : null) 
      : (existingTrade.rrAchieved ? Number(existingTrade.rrAchieved) : null);

    // Normalize signs
    if (finalResult) {
      if (finalResult === "LOSS") {
        if (finalPnl !== null && finalPnl > 0) {
          finalPnl = -finalPnl;
        }
        if (finalRr !== null && finalRr > 0) {
          finalRr = -finalRr;
        }
      } else if (finalResult === "WIN") {
        if (finalPnl !== null && finalPnl < 0) {
          finalPnl = Math.abs(finalPnl);
        }
        if (finalRr !== null && finalRr < 0) {
          finalRr = Math.abs(finalRr);
        }
      }
    }

    // Assign normalized values back to input or overwrite if result changed but field was omitted
    if (input.pnl !== undefined) {
      input.pnl = finalPnl;
    } else if (existingTrade.pnl && Number(existingTrade.pnl) !== finalPnl) {
      input.pnl = finalPnl;
    }

    if (input.rrAchieved !== undefined) {
      input.rrAchieved = finalRr;
    } else if (existingTrade.rrAchieved && Number(existingTrade.rrAchieved) !== finalRr) {
      input.rrAchieved = finalRr;
    }

    const oldPnl = existingTrade.pnl ? Number(existingTrade.pnl) : 0;
    const newPnl = input.pnl !== undefined ? (input.pnl !== null ? Number(input.pnl) : 0) : oldPnl;
    const diffPnl = newPnl - oldPnl;

    const trade = await prisma.$transaction(async (tx) => {
      const updatedTrade = await tx.trade.update({
        where: { id: tradeId },
        data: {
          pair: input.pair,
          date: input.date ? new Date(input.date) : undefined,
          session: input.session,
          direction: input.direction,
          entryPrice: input.entryPrice,
          stopLoss: input.stopLoss,
          takeProfit: input.takeProfit,
          riskPercent: input.riskPercent,
          result: input.result,
          rrAchieved: input.rrAchieved,
          pnl: input.pnl,
          notes: input.notes,
          strategyVersionId: input.strategyVersionId,
        },
      });

      // Adjust account balance by difference
      if (diffPnl !== 0) {
        await tx.account.update({
          where: { id: existingTrade.accountId },
          data: {
            currentBalance: {
              increment: diffPnl,
            },
          },
        });
      }

      // Evaluate challenge rules
      await AccountService.evaluateChallengeRules(tx, existingTrade.accountId);

      // Log audit
      await tx.auditLog.create({
        data: {
          userId,
          action: "UPDATE",
          entity: "trade",
          entityId: tradeId,
          details: { diffPnl },
        },
      });

      return updatedTrade;
    });

    // Invalidate cached metrics for this account
    revalidateTag(`account-${existingTrade.accountId}`, "max");

    return trade;
  }

  /**
   * Soft-deletes trade and reverses P&L impact on balance.
   */
  static async deleteTrade(userId: string, tradeId: string) {
    const existingTrade = await this.getTradeById(userId, tradeId);
    const pnlToReverse = existingTrade.pnl ? Number(existingTrade.pnl) : 0;

    await prisma.$transaction(async (tx) => {
      await tx.trade.update({
        where: { id: tradeId },
        data: {
          deletedAt: new Date(),
        },
      });

      // Reverse balance changes
      if (pnlToReverse !== 0) {
        await tx.account.update({
          where: { id: existingTrade.accountId },
          data: {
            currentBalance: {
              decrement: pnlToReverse,
            },
          },
        });
      }

      // Evaluate challenge rules
      await AccountService.evaluateChallengeRules(tx, existingTrade.accountId);

      // Log audit
      await tx.auditLog.create({
        data: {
          userId,
          action: "DELETE",
          entity: "trade",
          entityId: tradeId,
          details: { reversedPnl: pnlToReverse },
        },
      });
    });

    // Invalidate cached metrics for this account
    revalidateTag(`account-${existingTrade.accountId}`, "max");
  }

  /**
   * Aggregates trade data for the Calendar view.
   * Groups trades by date and returns per-day metrics + period summaries.
   */
  static async getCalendarData(
    userId: string,
    accountId: string | null,
    timeframe: "week" | "month" | "year" | "all",
    year: number,
    month: number // 0-indexed (0 = January)
  ) {
    const account = await this.getOrCreateUserAccount(userId, accountId);

    // Determine date range based on timeframe
    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    switch (timeframe) {
      case "week": {
        // Current week containing the given month/year context
        const refDate = new Date(year, month, 1);
        const dayOfWeek = refDate.getDay(); // 0=Sun
        startDate = new Date(refDate);
        startDate.setDate(refDate.getDate() - dayOfWeek);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case "month": {
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
        break;
      }
      case "year": {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59, 999);
        break;
      }
      case "all":
      default: {
        startDate = new Date(2000, 0, 1);
        endDate = new Date(2099, 11, 31, 23, 59, 59, 999);
        break;
      }
    }

    // Fetch all trades in the range
    const trades = await prisma.trade.findMany({
      where: {
        accountId: account.id,
        deletedAt: null,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        date: true,
        pnl: true,
        result: true,
        rrAchieved: true,
        pair: true,
      },
      orderBy: { date: "asc" },
    });

    // Group by date string (YYYY-MM-DD)
    const dailyMap: Record<
      string,
      {
        date: string;
        netPnl: number;
        tradeCount: number;
        winCount: number;
        lossCount: number;
        breakevenCount: number;
      }
    > = {};

    let totalPnl = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalBreakevens = 0;
    let totalGrossProfit = 0;
    let totalGrossLoss = 0;
    let rrSum = 0;
    let rrCount = 0;

    for (const trade of trades) {
      const dateKey = trade.date.toISOString().slice(0, 10);
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          netPnl: 0,
          tradeCount: 0,
          winCount: 0,
          lossCount: 0,
          breakevenCount: 0,
        };
      }
      const day = dailyMap[dateKey];
      const pnl = trade.pnl ? Number(trade.pnl) : 0;

      day.netPnl += pnl;
      day.tradeCount += 1;

      if (trade.result === "WIN") {
        day.winCount += 1;
        totalWins += 1;
        if (pnl > 0) totalGrossProfit += pnl;
      } else if (trade.result === "LOSS") {
        day.lossCount += 1;
        totalLosses += 1;
        if (pnl < 0) totalGrossLoss += Math.abs(pnl);
      } else if (trade.result === "BREAKEVEN") {
        day.breakevenCount += 1;
        totalBreakevens += 1;
      }

      totalPnl += pnl;

      if (trade.rrAchieved !== null) {
        rrSum += Number(trade.rrAchieved);
        rrCount += 1;
      }
    }

    const days = Object.values(dailyMap);
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    const profitFactor = totalGrossLoss > 0 ? totalGrossProfit / totalGrossLoss : totalGrossProfit > 0 ? Infinity : 0;
    const avgRR = rrCount > 0 ? rrSum / rrCount : 0;

    // Best and worst trading days
    let bestDay: { date: string; pnl: number } | null = null;
    let worstDay: { date: string; pnl: number } | null = null;
    for (const day of days) {
      if (!bestDay || day.netPnl > bestDay.pnl) {
        bestDay = { date: day.date, pnl: day.netPnl };
      }
      if (!worstDay || day.netPnl < worstDay.pnl) {
        worstDay = { date: day.date, pnl: day.netPnl };
      }
    }

    // Monthly net total (trades in the selected month regardless of timeframe)
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    let monthlyNetTotal = 0;
    for (const trade of trades) {
      if (trade.date >= monthStart && trade.date <= monthEnd) {
        monthlyNetTotal += trade.pnl ? Number(trade.pnl) : 0;
      }
    }

    // Annual net total
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
    let annualNetTotal = 0;
    // For annual total we may need to query separately if timeframe is month/week
    if (timeframe === "year" || timeframe === "all") {
      annualNetTotal = totalPnl; // already within year range
    } else {
      // Fetch annual separately
      const annualAgg = await prisma.trade.aggregate({
        where: {
          accountId: account.id,
          deletedAt: null,
          date: { gte: yearStart, lte: yearEnd },
        },
        _sum: { pnl: true },
      });
      annualNetTotal = Number(annualAgg._sum.pnl ?? 0);
    }

    return {
      days,
      summary: {
        totalTrades,
        totalPnl,
        monthlyNetTotal,
        annualNetTotal,
        winRate,
        totalWins,
        totalLosses,
        totalBreakevens,
        profitFactor: profitFactor === Infinity ? 999 : profitFactor,
        avgRR,
        bestDay,
        worstDay,
        tradingDays: days.length,
      },
      range: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  }
}
