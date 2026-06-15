import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ViolationsList } from "@/components/violations/violations-list";

export const metadata: Metadata = {
  title: "Rule Violations | Trading OS",
};

export default async function ViolationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const selectedAccountId = cookieStore.get("selected_account_id")?.value || null;

  // Query violations for the current user and filter by selected account if set
  const violations = await prisma.ruleViolation.findMany({
    where: {
      userId: session.user.id,
      OR: [
        { tradeId: null },
        {
          trade: {
            deletedAt: null,
          },
        },
      ],
      ...(selectedAccountId
        ? {
            trade: {
              accountId: selectedAccountId,
              deletedAt: null,
            },
          }
        : {}),
    },
    include: {
      trade: true,
      category: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Serialize Decimal and Date fields to standard numbers/strings for Client Component compatibility
  const serializedViolations = violations.map((v) => ({
    id: v.id,
    tradeId: v.tradeId,
    userId: v.userId,
    categoryId: v.categoryId,
    description: v.description,
    plImpact: v.plImpact ? Number(v.plImpact) : null,
    detectedBy: v.detectedBy,
    createdAt: v.createdAt.toISOString(),
    category: v.category
      ? {
          id: v.category.id,
          name: v.category.name,
          description: v.category.description,
          severity: v.category.severity,
          createdAt: v.category.createdAt.toISOString(),
        }
      : null,
    trade: v.trade
      ? {
          id: v.trade.id,
          pair: v.trade.pair,
          date: v.trade.date.toISOString(),
          session: v.trade.session,
          direction: v.trade.direction,
          entryPrice: Number(v.trade.entryPrice),
          stopLoss: Number(v.trade.stopLoss),
          takeProfit: Number(v.trade.takeProfit),
          riskPercent: Number(v.trade.riskPercent),
          result: v.trade.result,
          rrAchieved: v.trade.rrAchieved ? Number(v.trade.rrAchieved) : null,
          pnl: v.trade.pnl ? Number(v.trade.pnl) : null,
          notes: v.trade.notes,
        }
      : null,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Rule Violations</h1>
        <p className="text-sm text-gray-400 mt-1">
          Monitor your strategy compliance, risk violations, and their impact on your performance.
        </p>
      </div>

      <ViolationsList violations={serializedViolations} />
    </div>
  );
}
