import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BehaviorService } from "@/services/behavior.service";
import { prisma } from "@/lib/prisma";
import { CoachingDashboard } from "@/components/coaching/coaching-dashboard";

export const metadata: Metadata = {
  title: "Behavioral Coaching | Trader Brio",
  description: "Track your trading discipline, compliance, and consistency scores over time.",
};

export default async function CoachingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Calculate current weekly score (or use latest)
  const currentScore = await BehaviorService.calculateAndStore(userId, "WEEKLY");

  // Get weekly trend (last 12 weeks)
  const trend = await BehaviorService.getTrend(userId, "WEEKLY", 12);

  // Get coaching insights
  const insights = await BehaviorService.generateInsights(userId);

  // Get 30-day stats
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [violationCount, totalTrades30d] = await Promise.all([
    prisma.ruleViolation.count({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.trade.count({
      where: {
        account: { userId },
        deletedAt: null,
        date: { gte: thirtyDaysAgo },
      },
    }),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="border-b border-gray-900 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-gray-100 sm:text-2xl">
          Behavioral Coaching
        </h1>
        <p className="text-xs text-gray-500 mt-1 font-mono uppercase">
          Discipline • Compliance • Consistency — Your path to elite trading
        </p>
      </div>

      <CoachingDashboard
        currentScore={currentScore}
        trend={trend}
        insights={insights}
        violationCount={violationCount}
        totalTrades30d={totalTrades30d}
      />
    </div>
  );
}
