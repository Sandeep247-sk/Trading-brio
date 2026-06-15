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
    const trades = await prisma.trade.findMany({
      where: {
        strategyVersionId: versionId,
        deletedAt: null,
        result: { not: null },
      },
    });

    if (trades.length === 0) return null;

    const totalTrades = trades.length;
    const wins = trades.filter((t) => t.result === "WIN");
    const losses = trades.filter((t) => t.result === "LOSS");

    const winRate = (wins.length / totalTrades) * 100;
    
    // Net profit
    const netProfit = trades.reduce((acc, t) => acc + (t.pnl ? Number(t.pnl) : 0), 0);

    // Average RR achieved
    const validRRTrades = trades.filter((t) => t.rrAchieved !== null);
    const averageRR = validRRTrades.length > 0
      ? validRRTrades.reduce((acc, t) => acc + Number(t.rrAchieved), 0) / validRRTrades.length
      : 0;

    // Profit Factor = Gross Profit / Gross Loss
    const grossProfit = wins.reduce((acc, t) => acc + (t.pnl ? Number(t.pnl) : 0), 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + (t.pnl ? Number(t.pnl) : 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.99 : 0;

    // Fetch associated analysis scores (from Phase 4 AI engine)
    const analyses = await prisma.tradeAnalysis.findMany({
      where: {
        tradeId: { in: trades.map((t) => t.id) },
      },
    });

    const avgAdherence = analyses.length > 0
      ? analyses.reduce((acc, a) => acc + a.matchScore, 0) / analyses.length
      : 80; // Default placeholder fallback

    const avgExecution = analyses.length > 0
      ? analyses.reduce((acc, a) => acc + a.executionScore, 0) / analyses.length
      : 80;

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
