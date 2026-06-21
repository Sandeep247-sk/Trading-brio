import { prisma } from "@/lib/prisma";

export interface BehaviorScoreData {
  period: string;
  periodType: "WEEKLY" | "MONTHLY";
  disciplineScore: number;
  complianceScore: number;
  consistencyScore: number;
  totalTrades: number;
  compositeScore: number;
}

export interface CoachingInsight {
  type: "warning" | "tip" | "achievement";
  title: string;
  description: string;
  metric?: string;
}

export class BehaviorService {
  /**
   * Calculate and store behavior scores for the current period
   */
  static async calculateAndStore(
    userId: string,
    periodType: "WEEKLY" | "MONTHLY" = "WEEKLY"
  ): Promise<BehaviorScoreData> {
    const now = new Date();
    let period: string;
    let startDate: Date;
    let endDate: Date;

    if (periodType === "WEEKLY") {
      // ISO week: YYYY-Www
      const dayOfWeek = now.getDay() || 7;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
      startOfWeek.setHours(0, 0, 0, 0);
      endDate = new Date(startOfWeek);
      endDate.setDate(startOfWeek.getDate() + 7);
      const weekNum = getISOWeekNumber(now);
      period = `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
      startDate = startOfWeek;
    } else {
      period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    // Fetch trades in period
    const trades = await prisma.trade.findMany({
      where: {
        account: { userId },
        date: { gte: startDate, lt: endDate },
        deletedAt: null,
      },
      include: {
        violations: { include: { category: true } },
        analyses: true,
        strategyVersion: { include: { rules: true } },
      },
    });

    const totalTrades = trades.length;

    // --- Discipline Score (0-100) ---
    // Based on violations: fewer violations = higher score
    let totalViolations = 0;
    let violationPenalty = 0;
    trades.forEach((t) => {
      t.violations.forEach((v) => {
        totalViolations++;
        const severity = v.category?.severity;
        if (severity === "CRITICAL") violationPenalty += 25;
        else if (severity === "HIGH") violationPenalty += 15;
        else if (severity === "MEDIUM") violationPenalty += 8;
        else violationPenalty += 3;
      });
    });
    const disciplineScore = totalTrades > 0
      ? Math.max(0, Math.min(100, 100 - violationPenalty))
      : 100;

    // --- Compliance Score (0-100) ---
    // Based on how well trades follow strategy checklists
    let checkedItems = 0;
    let totalChecklistItems = 0;
    trades.forEach((t) => {
      if (t.analyses.length > 0) {
        const latestAnalysis = t.analyses[t.analyses.length - 1];
        const checklist = latestAnalysis.checklist as Array<{ rule: string; detected: boolean }>;
        if (Array.isArray(checklist)) {
          totalChecklistItems += checklist.length;
          checkedItems += checklist.filter((c) => c.detected).length;
        }
      }
    });
    const complianceScore = totalChecklistItems > 0
      ? Math.round((checkedItems / totalChecklistItems) * 100)
      : (totalTrades > 0 ? 75 : 100); // Default to 75 if no AI analysis yet

    // --- Consistency Score (0-100) ---
    // Based on standard deviation of daily PnL — lower = more consistent
    const dailyPnls: Record<string, number> = {};
    trades.forEach((t) => {
      const dayKey = new Date(t.date).toISOString().split("T")[0];
      dailyPnls[dayKey] = (dailyPnls[dayKey] || 0) + Number(t.pnl || 0);
    });
    const pnlValues = Object.values(dailyPnls);
    let consistencyScore = 100;
    if (pnlValues.length >= 2) {
      const mean = pnlValues.reduce((a, b) => a + b, 0) / pnlValues.length;
      const variance = pnlValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / pnlValues.length;
      const stdDev = Math.sqrt(variance);
      // Normalize: lower stdDev = higher score. Use balance-relative scaling
      const avgAbsPnl = pnlValues.reduce((sum, v) => sum + Math.abs(v), 0) / pnlValues.length;
      const coeffOfVariation = avgAbsPnl > 0 ? stdDev / avgAbsPnl : 0;
      consistencyScore = Math.max(0, Math.min(100, Math.round(100 - coeffOfVariation * 30)));
    }

    const compositeScore = Math.round(
      disciplineScore * 0.4 + complianceScore * 0.35 + consistencyScore * 0.25
    );

    // Upsert behavior score
    await prisma.behaviorScore.upsert({
      where: {
        userId_period_periodType: { userId, period, periodType },
      },
      update: {
        disciplineScore,
        complianceScore,
        consistencyScore,
        totalTrades,
        calculatedAt: new Date(),
      },
      create: {
        userId,
        period,
        periodType,
        disciplineScore,
        complianceScore,
        consistencyScore,
        totalTrades,
      },
    });

    return {
      period,
      periodType,
      disciplineScore,
      complianceScore,
      consistencyScore,
      totalTrades,
      compositeScore,
    };
  }

  /**
   * Get trend data for the last N periods
   */
  static async getTrend(
    userId: string,
    periodType: "WEEKLY" | "MONTHLY" = "WEEKLY",
    limit: number = 12
  ): Promise<BehaviorScoreData[]> {
    const scores = await prisma.behaviorScore.findMany({
      where: { userId, periodType },
      orderBy: { period: "desc" },
      take: limit,
    });

    return scores
      .map((s) => ({
        period: s.period,
        periodType: s.periodType as "WEEKLY" | "MONTHLY",
        disciplineScore: Number(s.disciplineScore),
        complianceScore: Number(s.complianceScore),
        consistencyScore: Number(s.consistencyScore),
        totalTrades: s.totalTrades,
        compositeScore: Math.round(
          Number(s.disciplineScore) * 0.4 +
          Number(s.complianceScore) * 0.35 +
          Number(s.consistencyScore) * 0.25
        ),
      }))
      .reverse(); // chronological order
  }

  /**
   * Generate coaching insights based on recent performance
   */
  static async generateInsights(userId: string): Promise<CoachingInsight[]> {
    const insights: CoachingInsight[] = [];

    // Fetch recent violations and trades in parallel
    const [recentViolations, recentTrades] = await Promise.all([
      prisma.ruleViolation.findMany({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        include: { category: true, trade: true },
      }),
      prisma.trade.findMany({
        where: {
          account: { userId },
          deletedAt: null,
          date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // Violation pattern analysis
    const categoryCount: Record<string, number> = {};
    recentViolations.forEach((v) => {
      const name = v.category?.name || "Unknown";
      categoryCount[name] = (categoryCount[name] || 0) + 1;
    });
    const sortedCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);

    if (sortedCategories.length > 0) {
      const [topCategory, count] = sortedCategories[0];
      insights.push({
        type: "warning",
        title: `Recurring: ${topCategory}`,
        description: `You have committed "${topCategory}" violations ${count} time${count > 1 ? "s" : ""} in the last 30 days. Focus on this area to improve your discipline score.`,
        metric: `${count} occurrences`,
      });
    }

    // Session analysis
    const sessionPnl: Record<string, { trades: number; pnl: number; wins: number }> = {};
    recentTrades.forEach((t) => {
      if (!sessionPnl[t.session]) sessionPnl[t.session] = { trades: 0, pnl: 0, wins: 0 };
      sessionPnl[t.session].trades++;
      sessionPnl[t.session].pnl += Number(t.pnl || 0);
      if (t.result === "WIN") sessionPnl[t.session].wins++;
    });

    const sessions = Object.entries(sessionPnl);
    const worstSession = sessions.sort((a, b) => a[1].pnl - b[1].pnl)[0];
    if (worstSession && worstSession[1].pnl < 0 && worstSession[1].trades >= 3) {
      const wr = Math.round((worstSession[1].wins / worstSession[1].trades) * 100);
      insights.push({
        type: "tip",
        title: `Weak Session: ${worstSession[0].replace(/_/g, " ")}`,
        description: `Your ${worstSession[0].replace(/_/g, " ")} session has a ${wr}% win rate with net loss of $${Math.abs(worstSession[1].pnl).toFixed(2)}. Consider reducing size or skipping this session.`,
        metric: `${wr}% WR`,
      });
    }

    // Streak tracking
    const sortedTrades = [...recentTrades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let cleanStreak = 0;
    for (const trade of sortedTrades) {
      const tradeViolations = recentViolations.filter((v) => v.tradeId === trade.id);
      if (tradeViolations.length === 0) cleanStreak++;
      else break;
    }

    if (cleanStreak >= 5) {
      insights.push({
        type: "achievement",
        title: `🔥 ${cleanStreak}-Trade Clean Streak!`,
        description: `Your last ${cleanStreak} trades had zero rule violations. Outstanding discipline — keep it up!`,
        metric: `${cleanStreak} trades`,
      });
    } else if (cleanStreak >= 3) {
      insights.push({
        type: "achievement",
        title: `${cleanStreak}-Trade Clean Streak`,
        description: `You're building momentum with ${cleanStreak} consecutive violation-free trades. Stay focused!`,
        metric: `${cleanStreak} trades`,
      });
    }

    // Win rate trend
    if (recentTrades.length >= 10) {
      const firstHalf = recentTrades.slice(0, Math.floor(recentTrades.length / 2));
      const secondHalf = recentTrades.slice(Math.floor(recentTrades.length / 2));
      const wr1 = firstHalf.filter((t) => t.result === "WIN").length / firstHalf.length;
      const wr2 = secondHalf.filter((t) => t.result === "WIN").length / secondHalf.length;
      const diff = Math.round((wr1 - wr2) * 100);
      if (diff > 10) {
        insights.push({
          type: "tip",
          title: "Win Rate Improving",
          description: `Your win rate has improved by ${diff}% in your recent trades compared to earlier. Your adjustments are paying off.`,
          metric: `+${diff}%`,
        });
      } else if (diff < -10) {
        insights.push({
          type: "warning",
          title: "Win Rate Declining",
          description: `Your win rate has dropped by ${Math.abs(diff)}% recently. Review your last few trades for patterns.`,
          metric: `${diff}%`,
        });
      }
    }

    // If no insights yet, add a positive default
    if (insights.length === 0) {
      insights.push({
        type: "tip",
        title: "Keep Trading!",
        description: "Log more trades to unlock personalized coaching insights based on your trading patterns.",
      });
    }

    return insights;
  }
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
