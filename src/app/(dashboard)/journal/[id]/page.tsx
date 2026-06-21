import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TradeService } from "@/services/trade.service";
import { TradeActions } from "@/components/journal/trade-actions";
import { ScreenshotGallery } from "@/components/journal/screenshot-gallery";
import { ExpandableNotes } from "@/components/journal/expandable-notes";
import { Direction, TradeResult, ImageType, RuleCategory } from "@prisma/client";
import { Calendar, Sparkles } from "lucide-react";
import { TradeAiAudit } from "@/components/journal/trade-ai-audit";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Trade details ${id.substring(0, 8)} | Trader Brio`,
  };
}

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  
  let trade;
  try {
    trade = await TradeService.getTradeById(session.user.id, id);
  } catch (error) {
    redirect("/journal");
  }

  const tradePnl = trade.pnl ? Number(trade.pnl) : 0;
  const isWin = trade.result === TradeResult.WIN;
  const isLoss = trade.result === TradeResult.LOSS;
  const isBreakeven = trade.result === TradeResult.BREAKEVEN;

  // Group screenshots by type
  const screenshots = trade.images || [];
  
  // Get active strategy rules
  const rules = trade.strategyVersion?.rules || [];

  // Fetch the latest analysis
  const latestAnalysis = trade.analyses && trade.analyses.length > 0
    ? [...trade.analyses].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0]
    : null;

  const getGradeColors = (grade: string) => {
    switch (grade) {
      case "A_PLUS":
      case "A":
        return "bg-emerald-600/10 border-emerald-500/30 text-emerald-400";
      case "B":
        return "bg-blue-600/10 border-blue-500/30 text-blue-400";
      case "C":
        return "bg-amber-600/10 border-amber-500/30 text-amber-400";
      case "D":
      default:
        return "bg-red-600/10 border-red-500/30 text-red-400";
    }
  };

  return (
    <div className="space-y-6 relative pb-12 print:p-0">
      
      {/* Sticky Header and actions */}
      <div className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur-md border-b border-gray-900 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg print:relative print:border-none print:shadow-none">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {trade.pair} Execution Detail
            </h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                trade.direction === Direction.LONG
                  ? "bg-blue-600/10 border-blue-500/30 text-blue-400"
                  : "bg-red-600/10 border-red-500/30 text-red-400"
              }`}
            >
              {trade.direction}
            </span>
            {trade.result ? (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                  isWin
                    ? "bg-green-600/10 border-green-500/30 text-green-400"
                    : isLoss
                    ? "bg-red-600/10 border-red-500/30 text-red-400"
                    : "bg-amber-600/10 border-amber-500/30 text-amber-400"
                }`}
              >
                {trade.result}
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 border border-gray-850 px-2 py-0.5 rounded">
                Open
              </span>
            )}
            {/* Sticky Grade Badge */}
            {latestAnalysis && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide border ${getGradeColors(latestAnalysis.grade)}`}>
                GRADE {latestAnalysis.grade.replace("_PLUS", "+")}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-gray-400 mt-1 font-mono">
            <Calendar className="h-3.5 w-3.5 text-gray-500" />
            <span>
              {new Date(trade.date).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span>•</span>
            <span className="uppercase">{trade.session.replace(/_/g, " ")} Session</span>
          </div>
        </div>
        <div className="print:hidden">
          <TradeActions tradeId={trade.id} />
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-gray-900/40 p-4 border border-gray-800 rounded-lg">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Entry Price</p>
          <p className="text-base font-bold text-white mt-1 font-mono">{Number(trade.entryPrice)}</p>
        </div>
        <div className="bg-gray-900/40 p-4 border border-gray-800 rounded-lg">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Stop Loss</p>
          <p className="text-base font-bold text-gray-300 mt-1 font-mono">{Number(trade.stopLoss)}</p>
        </div>
        <div className="bg-gray-900/40 p-4 border border-gray-800 rounded-lg">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Take Profit</p>
          <p className="text-base font-bold text-gray-300 mt-1 font-mono">{Number(trade.takeProfit)}</p>
        </div>
        <div className="bg-gray-900/40 p-4 border border-gray-800 rounded-lg">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Risk Percent</p>
          <p className="text-base font-bold text-gray-300 mt-1 font-mono">{Number(trade.riskPercent)}%</p>
        </div>
        <div className="bg-gray-900/40 p-4 border border-gray-800 rounded-lg">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">RR Achieved</p>
          <p className="text-base font-bold text-blue-500 mt-1 font-mono">
            {trade.rrAchieved !== null ? `${Number(trade.rrAchieved)} R` : "-- R"}
          </p>
        </div>
        <div className="bg-gray-900/40 p-4 border border-gray-800 rounded-lg col-span-2 md:col-span-1">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">P&L</p>
          <p className={`text-base font-bold mt-1 font-mono ${tradePnl >= 0 ? "text-green-500" : "text-red-500"}`}>
            {trade.result ? `${tradePnl >= 0 ? "+" : ""}$${tradePnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "--"}
          </p>
        </div>
      </div>

      {/* Reorganized Vertical Flow */}
      <div className="space-y-6">
        {/* 1. Trade Notes & Context */}
        <ExpandableNotes notes={trade.notes} />

        {/* 2. Execution Screenshots */}
        <div className="bg-gray-950 border border-gray-850 p-6 rounded-lg space-y-4">
          <h3 className="text-sm font-semibold text-gray-200">Execution Screenshots</h3>
          <ScreenshotGallery screenshots={screenshots.map((s) => ({
            id: s.id,
            url: s.url,
            type: s.type,
            sizeBytes: s.sizeBytes,
          }))} />
        </div>

        {/* 3. AI Audit Results, Strategy Checklist, and Violations History (occupying entire content width) */}
        <div className="bg-gray-950 border border-gray-850 p-6 rounded-lg">
          <TradeAiAudit
            tradeId={trade.id}
            rules={rules.map((r: any) => ({
              id: r.id,
              category: r.category,
              name: r.name,
              description: r.description,
              isRequired: r.isRequired,
              order: r.order,
            }))}
            strategyName={trade.strategyVersion?.strategy.name || "--"}
            strategyVersion={trade.strategyVersion?.version || "--"}
            initialAnalysis={
              trade.analyses && trade.analyses.length > 0
                ? (() => {
                    const sorted = [...trade.analyses].sort(
                      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
                    const latest = sorted[0];
                    return {
                      id: latest.id,
                      matchScore: latest.matchScore,
                      executionScore: latest.executionScore,
                      disciplineScore: latest.disciplineScore,
                      grade: latest.grade,
                      checklist: latest.checklist,
                      mistakes: latest.mistakes,
                      suggestions: latest.suggestions,
                      detectedViolations: latest.detectedViolations,
                      modelUsed: latest.modelUsed,
                      createdAt: latest.createdAt,
                    };
                  })()
                : null
            }
            violations={trade.violations.map((v: any) => ({
              id: v.id,
              description: v.description,
              plImpact: v.plImpact,
              category: {
                name: v.category.name,
                severity: v.category.severity,
              }
            }))}
          />
        </div>
      </div>
    </div>
  );
}
