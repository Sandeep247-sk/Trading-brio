import { prisma } from "@/lib/prisma";
import { CreateStrategyInput, UpdateStrategyInput } from "@/lib/validations/strategy";
import { RuleCategory, TradingSession } from "@prisma/client";

export class StrategyService {
  /**
   * List all active strategies for a user.
   */
  static async getStrategies(userId: string) {
    return prisma.strategy.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        versions: {
          where: { isActive: true },
          include: {
            rules: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  /**
   * Retrieves a strategy by ID and verifies ownership.
   */
  static async getStrategyById(userId: string, strategyId: string) {
    const strategy = await prisma.strategy.findFirst({
      where: {
        id: strategyId,
        deletedAt: null,
      },
      include: {
        versions: {
          orderBy: { version: "desc" },
          include: {
            rules: {
              orderBy: { order: "asc" },
            },
            performanceHistory: {
              orderBy: { calculatedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!strategy) {
      throw new Error("Strategy not found");
    }

    if (strategy.userId !== userId) {
      throw new Error("Unauthorized access to this strategy");
    }

    return strategy;
  }

  /**
   * Creates a new strategy with version 1.
   */
  static async createStrategy(userId: string, input: CreateStrategyInput) {
    return prisma.$transaction(async (tx) => {
      const strategy = await tx.strategy.create({
        data: {
          userId,
          name: input.name,
          market: input.market,
        },
      });

      const version = await tx.strategyVersion.create({
        data: {
          strategyId: strategy.id,
          version: 1,
          preferredSessions: input.preferredSessions,
          higherTimeframes: input.higherTimeframes,
          entryTimeframes: input.entryTimeframes,
          entryConditions: input.entryConditions,
          riskRules: input.riskRules,
          managementRules: input.managementRules,
          changelog: "Initial strategy creation",
          isActive: true,
        },
      });

      // Create rules if provided, otherwise populate default rules from timeframes/conditions
      const rulesToCreate = input.rules || [];
      
      // If no custom checklist rules provided, seed default rules based on conditions
      if (rulesToCreate.length === 0) {
        input.entryConditions.forEach((cond, index) => {
          rulesToCreate.push({
            category: RuleCategory.ENTRY,
            name: cond,
            description: `Verify confluence for ${cond}`,
            isRequired: true,
            order: index,
          });
        });
        
        input.preferredSessions.forEach((session, index) => {
          rulesToCreate.push({
            category: RuleCategory.SESSION,
            name: `Trade during ${session} session`,
            description: `Ensure order execution fits within London, New York or Asian liquidity hours`,
            isRequired: true,
            order: index + 50,
          });
        });
      }

      if (rulesToCreate.length > 0) {
        await tx.strategyRule.createMany({
          data: rulesToCreate.map((r) => ({
            versionId: version.id,
            category: r.category,
            name: r.name,
            description: r.description || null,
            isRequired: r.isRequired ?? true,
            order: r.order ?? 0,
          })),
        });
      }

      // Log audit
      await tx.auditLog.create({
        data: {
          userId,
          action: "CREATE",
          entity: "strategy",
          entityId: strategy.id,
          details: { name: input.name, version: 1 },
        },
      });

      return { ...strategy, activeVersion: version };
    });
  }

  /**
   * Updates strategy. Clones the previous active version, increments version number,
   * adds a changelog entry, and saves new rules.
   */
  static async updateStrategy(
    userId: string,
    strategyId: string,
    input: UpdateStrategyInput & { changelogNotes?: string }
  ) {
    const existingStrategy = await this.getStrategyById(userId, strategyId);
    const activeVersion = existingStrategy.versions.find((v) => v.isActive);

    if (!activeVersion) {
      throw new Error("No active version found to update");
    }

    const nextVersionNum = activeVersion.version + 1;

    return prisma.$transaction(async (tx) => {
      // 1. Mark current version inactive
      await tx.strategyVersion.update({
        where: { id: activeVersion.id },
        data: { isActive: false },
      });

      // 2. Update parent Strategy metadata if updated
      const updatedStrategy = await tx.strategy.update({
        where: { id: strategyId },
        data: {
          name: input.name,
          market: input.market,
        },
      });

      // 3. Create new StrategyVersion
      const newVersion = await tx.strategyVersion.create({
        data: {
          strategyId,
          version: nextVersionNum,
          preferredSessions: (input.preferredSessions ?? activeVersion.preferredSessions) as any,
          higherTimeframes: (input.higherTimeframes ?? activeVersion.higherTimeframes) as any,
          entryTimeframes: (input.entryTimeframes ?? activeVersion.entryTimeframes) as any,
          entryConditions: (input.entryConditions ?? activeVersion.entryConditions) as any,
          riskRules: (input.riskRules ?? activeVersion.riskRules) as any,
          managementRules: (input.managementRules ?? activeVersion.managementRules) as any,
          changelog: input.changelogNotes || `Updated rules to version ${nextVersionNum}`,
          isActive: true,
        },
      });

      // 4. Create Strategy Rules
      const rulesToCreate = input.rules || [];
      if (rulesToCreate.length > 0) {
        await tx.strategyRule.createMany({
          data: rulesToCreate.map((r) => ({
            versionId: newVersion.id,
            category: r.category,
            name: r.name,
            description: r.description || null,
            isRequired: r.isRequired ?? true,
            order: r.order ?? 0,
          })),
        });
      } else {
        // Clone old rules if new ones are not provided
        const oldRules = activeVersion.rules;
        if (oldRules.length > 0) {
          await tx.strategyRule.createMany({
            data: oldRules.map((r) => ({
              versionId: newVersion.id,
              category: r.category,
              name: r.name,
              description: r.description,
              isRequired: r.isRequired,
              order: r.order,
            })),
          });
        }
      }

      // 5. Generate Change Logs
      await tx.strategyChangeLog.create({
        data: {
          versionId: newVersion.id,
          changeType: "UPDATE",
          field: "all",
          newValue: input.changelogNotes || `Strategy updated to version ${nextVersionNum}`,
        },
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          userId,
          action: "UPDATE",
          entity: "strategy",
          entityId: strategyId,
          details: { version: nextVersionNum },
        },
      });

      return { ...updatedStrategy, activeVersion: newVersion };
    });
  }

  /**
   * Soft-deletes a strategy.
   */
  static async deleteStrategy(userId: string, strategyId: string) {
    const existing = await this.getStrategyById(userId, strategyId);

    await prisma.$transaction(async (tx) => {
      await tx.strategy.update({
        where: { id: strategyId },
        data: { deletedAt: new Date() },
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          userId,
          action: "DELETE",
          entity: "strategy",
          entityId: strategyId,
        },
      });
    });
  }

  /**
   * Recalculates metrics for a strategy version based on trade history.
   */
  static async calculateStrategyPerformance(userId: string, versionId: string) {
    const baseWhere = {
      strategyVersionId: versionId,
      deletedAt: null,
      result: { not: null },
    };

    const totalTrades = await prisma.trade.count({
      where: baseWhere,
    });

    if (totalTrades === 0) return null;

    const [winsCount, lossesCount, pnlAgg, rrAgg, grossProfitAgg, grossLossAgg, analysisAgg] = await Promise.all([
      prisma.trade.count({
        where: { ...baseWhere, result: "WIN" },
      }),
      prisma.trade.count({
        where: { ...baseWhere, result: "LOSS" },
      }),
      prisma.trade.aggregate({
        where: baseWhere,
        _sum: { pnl: true },
      }),
      prisma.trade.aggregate({
        where: { ...baseWhere, rrAchieved: { not: null } },
        _avg: { rrAchieved: true },
      }),
      prisma.trade.aggregate({
        where: { ...baseWhere, pnl: { gt: 0 } },
        _sum: { pnl: true },
      }),
      prisma.trade.aggregate({
        where: { ...baseWhere, pnl: { lt: 0 } },
        _sum: { pnl: true },
      }),
      prisma.tradeAnalysis.aggregate({
        where: {
          trade: {
            strategyVersionId: versionId,
            deletedAt: null,
            result: { not: null },
          },
        },
        _avg: {
          matchScore: true,
          executionScore: true,
        },
      }),
    ]);

    const winRate = (winsCount / totalTrades) * 100;
    const netProfit = Number(pnlAgg._sum.pnl ?? 0);
    const grossProfit = Number(grossProfitAgg._sum.pnl ?? 0);
    const grossLoss = Math.abs(Number(grossLossAgg._sum.pnl ?? 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.99 : 0;
    const averageRR = rrAgg._avg.rrAchieved !== null ? Number(rrAgg._avg.rrAchieved) : 0;
    const avgAdherence = analysisAgg._avg.matchScore !== null ? Number(analysisAgg._avg.matchScore) : 80;
    const avgExecution = analysisAgg._avg.executionScore !== null ? Number(analysisAgg._avg.executionScore) : 80;

    return prisma.strategyPerformanceHistory.create({
      data: {
        versionId,
        totalTrades,
        winRate,
        profitFactor,
        averageRR,
        netProfit,
        adherenceScore: avgAdherence,
        executionScore: avgExecution,
      },
    });
  }
}
