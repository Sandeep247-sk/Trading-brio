import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TradeService } from "@/services/trade.service";
import { AnalyticsService } from "@/services/analytics.service";
import { AccountService } from "@/services/account.service";
import { prisma } from "@/lib/prisma";
import { JournalAccountSelector } from "@/components/journal/journal-account-selector";
import { BarChart3, TrendingUp, Target, Activity, Percent, PieChart as PieChartIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EquityCurve } from "@/components/charts/equity-curve";
import { MonthlyPnlChart } from "@/components/charts/monthly-pnl-chart";
import { PairPerformanceChart } from "@/components/charts/pair-performance-chart";
import { SessionPieChart } from "@/components/charts/session-pie-chart";
import { PnlDistributionChart } from "@/components/charts/pnl-distribution-chart";

export const metadata: Metadata = {
  title: "Analytics | Trader Brio",
};

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const selectedAccountId = cookieStore.get("selected_account_id")?.value || null;
  const account = await TradeService.getOrCreateUserAccount(session.user.id, selectedAccountId);
  
  // Fetch ALL data in parallel — accounts, metrics, and analytics bundle
  const [accountsList, metrics, analyticsBundle] =
    await Promise.all([
      prisma.account.findMany({
        where: { userId: session.user.id },
        select: { id: true, name: true, currency: true },
      }),
      AccountService.getAccountMetrics(session.user.id, account.id),
      AnalyticsService.getAnalyticsBundle(session.user.id, account.id),
    ]);

  const {
    equityCurve,
    monthlyPnl,
    pairPerformance,
    sessionDistribution: sessionDist,
    pnlDistribution,
  } = analyticsBundle;

  const currency = metrics.accountInfo.currency;

  const formatVal = (val: number) => {
    const symbol = currency === "INR" ? "₹" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
    return `${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-900 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-100 sm:text-2xl">
            Performance Analytics — <span className="text-blue-500">{metrics.accountInfo.name}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1 font-mono uppercase">
            {metrics.performance.totalTrades} total trades • Win Rate: {metrics.performance.winRate.toFixed(1)}% • 
            Profit Factor: {metrics.performance.profitFactor === null || metrics.performance.profitFactor === undefined || metrics.performance.profitFactor === Infinity ? "∞" : Number(metrics.performance.profitFactor).toFixed(2)}
          </p>
        </div>
        <div className="w-44 text-left">
          <JournalAccountSelector accounts={accountsList} currentAccountId={account.id} />
        </div>
      </div>

      {/* Key Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Net P&L", value: `${metrics.performance.netProfit >= 0 ? "+" : ""}${formatVal(metrics.performance.netProfit)}`, color: metrics.performance.netProfit >= 0 ? "text-green-400" : "text-red-400" },
          { label: "Win Rate", value: `${metrics.performance.winRate.toFixed(1)}%`, color: "text-green-400" },
          { label: "Profit Factor", value: metrics.performance.profitFactor === null || metrics.performance.profitFactor === undefined || metrics.performance.profitFactor === Infinity ? "∞" : Number(metrics.performance.profitFactor).toFixed(2), color: metrics.performance.profitFactor && metrics.performance.profitFactor !== Infinity && metrics.performance.profitFactor >= 1.5 ? "text-green-400" : metrics.performance.profitFactor && metrics.performance.profitFactor !== Infinity && metrics.performance.profitFactor > 0 ? "text-orange-400" : "text-gray-400" },
          { label: "Avg RR", value: `${metrics.performance.averageRR.toFixed(2)}R`, color: "text-blue-400" },
          { label: "Best Trade", value: `+${formatVal(metrics.performance.bestTrade)}`, color: "text-green-450" },
          { label: "Worst Trade", value: formatVal(metrics.performance.worstTrade), color: "text-red-450" },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-950 border border-gray-850 rounded-lg p-3">
            <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">{stat.label}</p>
            <p className={`text-sm font-bold font-mono mt-0.5 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Equity Curve — Full Width */}
      <Card className="bg-card/85 border-gray-850">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-200">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            Equity Curve
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Account balance progression over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EquityCurve data={equityCurve} currency={currency} />
        </CardContent>
      </Card>

      {/* Monthly P&L + Session Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-card/85 border-gray-850">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-200">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Monthly P&L
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Net profit/loss by month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyPnlChart data={monthlyPnl} currency={currency} />
          </CardContent>
        </Card>

        <Card className="bg-card/85 border-gray-850">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-200">
              <PieChartIcon className="h-4 w-4 text-blue-500" />
              Session Distribution
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Trades by session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SessionPieChart data={sessionDist} currency={currency} />
          </CardContent>
        </Card>
      </div>

      {/* Pair Performance + P&L Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card/85 border-gray-850">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-200">
              <Target className="h-4 w-4 text-blue-500" />
              Pair Performance
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Net P&L breakdown by trading pair
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PairPerformanceChart data={pairPerformance} currency={currency} />
          </CardContent>
        </Card>

        <Card className="bg-card/85 border-gray-850">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-200">
              <Activity className="h-4 w-4 text-blue-500" />
              P&L Distribution
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Distribution of trade outcomes by profit/loss range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PnlDistributionChart data={pnlDistribution} />
          </CardContent>
        </Card>
      </div>

      {/* Pair Performance Table */}
      {pairPerformance.length > 0 && (
        <Card className="bg-card/85 border-gray-850">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-200">
              <Percent className="h-4 w-4 text-blue-500" />
              Detailed Pair Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-900 text-gray-500 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Pair</th>
                    <th className="py-2.5 px-3">Trades</th>
                    <th className="py-2.5 px-3">Wins</th>
                    <th className="py-2.5 px-3">Losses</th>
                    <th className="py-2.5 px-3">Win Rate</th>
                    <th className="py-2.5 px-3">Net P&L</th>
                    <th className="py-2.5 px-3">Avg RR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 text-gray-300">
                  {pairPerformance.map((p) => (
                    <tr key={p.pair} className="hover:bg-gray-900/10 transition">
                      <td className="py-3 px-3 font-semibold text-gray-200">{p.pair}</td>
                      <td className="py-3 px-3 font-mono">{p.trades}</td>
                      <td className="py-3 px-3 font-mono text-green-400">{p.wins}</td>
                      <td className="py-3 px-3 font-mono text-red-400">{p.losses}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-green-400">{p.winRate.toFixed(1)}%</span>
                          <div className="w-16 bg-gray-900 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${p.winRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className={`py-3 px-3 font-bold font-mono ${p.netPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {p.netPnl >= 0 ? "+" : ""}{formatVal(p.netPnl)}
                      </td>
                      <td className="py-3 px-3 font-mono text-blue-400">{p.avgRR.toFixed(2)}R</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
