import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountService } from "@/services/account.service";
import { TradeService } from "@/services/trade.service";
import { AnalyticsService } from "@/services/analytics.service";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Activity,
  Percent,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { EquityCurve } from "@/components/charts/equity-curve";
import { JournalAccountSelector } from "@/components/journal/journal-account-selector";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Dashboard | Trader Brio",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const selectedAccountId = cookieStore.get("selected_account_id")?.value || null;
  const account = await TradeService.getOrCreateUserAccount(session.user.id, selectedAccountId);

  // Fetch all data in parallel — critical optimization
  const [accountsList, metrics, { trades: recentTrades }, equityCurve] = await Promise.all([
    prisma.account.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, currency: true },
    }),
    AccountService.getAccountMetrics(session.user.id, account.id),
    TradeService.getTrades(session.user.id, {}, { page: 1, limit: 5 }, account.id),
    AnalyticsService.getEquityCurve(session.user.id, account.id),
  ]);

  const stats = {
    currentBalance: metrics.accountInfo.currentBalance,
    startingBalance: metrics.accountInfo.startingBalance,
    totalGrowth: metrics.accountInfo.growthPercent,
    totalProfit: metrics.performance.totalProfit,
    totalLoss: metrics.performance.totalLoss,
    netPnl: metrics.performance.netProfit,
    winRate: metrics.performance.winRate,
    lossRate: metrics.performance.lossRate,
    profitFactor: metrics.performance.profitFactor,
    avgRR: metrics.performance.averageRR,
    bestTrade: metrics.performance.bestTrade,
    worstTrade: metrics.performance.worstTrade,
    totalTrades: metrics.performance.totalTrades,
    currency: metrics.accountInfo.currency,
  };

  const sessionsList = [
    {
      name: "London",
      trades: metrics.sessionStats.sessions.LONDON.trades,
      winRate: metrics.sessionStats.sessions.LONDON.trades > 0 
        ? Math.round((metrics.sessionStats.sessions.LONDON.wins / metrics.sessionStats.sessions.LONDON.trades) * 100) 
        : 0,
      pnl: metrics.sessionStats.sessions.LONDON.pnl,
      color: "bg-blue-500",
    },
    {
      name: "New York",
      trades: metrics.sessionStats.sessions.NEW_YORK.trades,
      winRate: metrics.sessionStats.sessions.NEW_YORK.trades > 0 
        ? Math.round((metrics.sessionStats.sessions.NEW_YORK.wins / metrics.sessionStats.sessions.NEW_YORK.trades) * 100) 
        : 0,
      pnl: metrics.sessionStats.sessions.NEW_YORK.pnl,
      color: "bg-emerald-500",
    },
    {
      name: "Asian",
      trades: metrics.sessionStats.sessions.ASIAN.trades,
      winRate: metrics.sessionStats.sessions.ASIAN.trades > 0 
        ? Math.round((metrics.sessionStats.sessions.ASIAN.wins / metrics.sessionStats.sessions.ASIAN.trades) * 100) 
        : 0,
      pnl: metrics.sessionStats.sessions.ASIAN.pnl,
      color: "bg-amber-500",
    },
  ];

  const formatVal = (val: number) => {
    const symbol = stats.currency === "INR" ? "₹" : stats.currency === "EUR" ? "€" : stats.currency === "GBP" ? "£" : "$";
    return `${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Terminal Overview — <span className="text-blue-500">{metrics.accountInfo.name}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono uppercase">
            Broker: {metrics.accountInfo.brokerName || "None"} • Type: {metrics.accountInfo.accountType ? metrics.accountInfo.accountType.replace(/_/g, " ") : "LIVE"} • Platform: {metrics.accountInfo.platform || "OTHER"}
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div className="w-44 text-left">
            <JournalAccountSelector accounts={accountsList} currentAccountId={account.id} />
          </div>
          <Link
            href="/journal/new"
            className="h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition shrink-0"
          >
            Add New Trade
          </Link>
        </div>
      </div>

      {/* Account Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current Balance"
          value={formatVal(stats.currentBalance)}
          icon={<DollarSign className="h-4 w-4" />}
          trend={{ value: stats.totalGrowth, label: "all time" }}
          variant="default"
        />
        <StatCard
          title="Net P&L"
          value={`${stats.netPnl >= 0 ? "+" : ""}${formatVal(stats.netPnl)}`}
          icon={stats.netPnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          subtitle={`Profit: ${formatVal(stats.totalProfit)} | Loss: ${formatVal(Math.abs(stats.totalLoss))}`}
          variant={stats.netPnl >= 0 ? "success" : "danger"}
        />
        <StatCard
          title="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          icon={<Target className="h-4 w-4" />}
          subtitle={`${stats.totalTrades} total trades`}
        />
        <StatCard
          title="Profit Factor"
          value={stats.profitFactor === null || stats.profitFactor === undefined || stats.profitFactor === Infinity ? "∞" : Number(stats.profitFactor).toFixed(2)}
          icon={<BarChart3 className="h-4 w-4" />}
          subtitle={`Avg RR: ${stats.avgRR.toFixed(2)}R`}
          variant={
            stats.profitFactor && stats.profitFactor !== Infinity && stats.profitFactor >= 1.5
              ? "success"
              : stats.profitFactor && stats.profitFactor !== Infinity && stats.profitFactor > 0
              ? "warning"
              : "default"
          }
        />
      </div>

      {/* Trading Stats + Session Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trading Statistics */}
        <Card className="lg:col-span-2 bg-card/85 border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Activity className="h-4 w-4 text-blue-500" />
              Trading Statistics
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Key performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, color: "text-green-500" },
                { label: "Loss Rate", value: `${stats.lossRate.toFixed(1)}%`, color: "text-red-500" },
                { label: "Avg RR", value: `${stats.avgRR.toFixed(2)}R`, color: "text-blue-500 font-mono" },
                { label: "Profit Factor", value: stats.profitFactor === null || stats.profitFactor === undefined || stats.profitFactor === Infinity ? "∞" : Number(stats.profitFactor).toFixed(2), color: "text-foreground font-mono" },
                { label: "Best Trade", value: `+${formatVal(stats.bestTrade)}`, color: "text-green-500 font-mono" },
                { label: "Worst Trade", value: `-${formatVal(Math.abs(stats.worstTrade))}`, color: "text-red-500 font-mono" },
                { label: "Starting Balance", value: formatVal(stats.startingBalance), color: "text-muted-foreground font-mono" },
                { label: "Total Trades", value: String(stats.totalTrades), color: "text-foreground font-mono" },
              ].map((stat) => (
                <div key={stat.label} className="space-y-1 p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{stat.label}</p>
                  <p className={`text-sm sm:text-base font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Session Analytics */}
        <Card className="bg-card/85 border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Zap className="h-4 w-4 text-blue-500" />
              Session Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionsList.map((session) => (
              <div key={session.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${session.color}`} />
                    <span className="text-xs sm:text-sm font-semibold text-foreground">{session.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {session.trades} trades
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>WR: <span className="text-green-500 font-bold font-mono">{session.winRate}%</span></span>
                  <span>P&L: <span className={`font-bold font-mono ${session.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {session.pnl >= 0 ? "+" : ""}{formatVal(session.pnl)}
                  </span></span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${session.color} transition-all duration-500`}
                    style={{ width: `${session.winRate}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Mini Equity Curve */}
      <Card className="bg-card/85 border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Equity Curve
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Balance progression</CardDescription>
          </div>
          <Link href="/analytics" className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition">
            Full Analytics
          </Link>
        </CardHeader>
        <CardContent>
          <EquityCurve data={equityCurve} currency={stats.currency} mini />
        </CardContent>
      </Card>

      {/* Recent Trades Table */}
      <Card className="bg-card/85 border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">Recent Trades</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Your latest trading activity</CardDescription>
          </div>
          <Link href="/journal" className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition">
            View Journal
          </Link>
        </CardHeader>
        <CardContent>
          {recentTrades.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xs text-muted-foreground">
                No trades logged yet. Start by{" "}
                <Link href="/journal/new" className="text-blue-500 hover:underline font-semibold">
                  adding your first trade
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Pair</th>
                    <th className="py-2.5 px-3">Direction</th>
                    <th className="py-2.5 px-3">Session</th>
                    <th className="py-2.5 px-3">Result</th>
                    <th className="py-2.5 px-3">PnL</th>
                    <th className="py-2.5 px-3">R:R</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {recentTrades.map((t) => {
                    const isWin = t.result === "WIN";
                    const isLoss = t.result === "LOSS";
                    const isPending = !t.result;
                    const tradePnl = t.pnl ? Number(t.pnl) : 0;
                    return (
                      <tr key={t.id} className="hover:bg-muted/30 transition">
                        <td className="py-3 px-3 font-semibold text-foreground">{t.pair}</td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            t.direction === "LONG" 
                              ? "bg-green-600/10 text-green-500" 
                              : "bg-red-600/10 text-red-500"
                          }`}>
                            {t.direction}
                          </span>
                        </td>
                        <td className="py-3 px-3 uppercase text-muted-foreground">{t.session.replace(/_/g, " ")}</td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isWin 
                              ? "bg-green-600/10 text-green-500 border border-green-500/20" 
                              : isLoss 
                              ? "bg-red-600/10 text-red-500 border border-red-500/20"
                              : "bg-muted/50 text-muted-foreground"
                          }`}>
                            {t.result || "PENDING"}
                          </span>
                        </td>
                        <td className={`py-3 px-3 font-bold font-mono ${
                          tradePnl > 0 ? "text-green-500" : tradePnl < 0 ? "text-red-500" : "text-muted-foreground"
                        }`}>
                          {tradePnl > 0 ? "+" : ""}
                          {tradePnl !== 0 ? formatVal(tradePnl) : "—"}
                        </td>
                        <td className="py-3 px-3 font-mono text-muted-foreground">
                          {t.rrAchieved !== null ? `${Number(t.rrAchieved).toFixed(2)} R` : "—"}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {new Date(t.date).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
