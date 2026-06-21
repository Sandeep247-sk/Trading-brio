import { prisma } from "@/lib/prisma";
import { Direction, TradeResult, TradingSession } from "@prisma/client";
import { CreateTradeInput, UpdateTradeInput } from "@/lib/validations/trade";
import { revalidateTag } from "next/cache";

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

    const tradePnl = input.pnl !== undefined ? input.pnl : null;

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
}
