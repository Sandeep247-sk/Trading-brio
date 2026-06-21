import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TradeService, TradeFilters } from "@/services/trade.service";
import { Plus, Search, Filter, ArrowUpRight, ArrowDownRight, Minus, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Direction, TradeResult, TradingSession } from "@prisma/client";
import { TRADING_PAIRS } from "@/lib/constants";
import { JournalAccountSelector } from "@/components/journal/journal-account-selector";

import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Trade Journal | Trader Brio",
};

interface SearchParams {
  page?: string;
  pair?: string;
  session?: string;
  direction?: string;
  result?: string;
  strategyId?: string;
  startDate?: string;
  endDate?: string;
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const limit = 10;

  const filters: TradeFilters = {
    pair: params.pair || undefined,
    session: (params.session as TradingSession) || undefined,
    direction: (params.direction as Direction) || undefined,
    result: (params.result as TradeResult) || undefined,
    strategyId: params.strategyId || undefined,
    startDate: params.startDate || undefined,
    endDate: params.endDate || undefined,
  };

  const cookieStore = await cookies();
  const selectedAccountId = cookieStore.get("selected_account_id")?.value || null;
  const account = await TradeService.getOrCreateUserAccount(session.user.id, selectedAccountId);

  // Fetch ALL data in parallel — accounts, trades, strategies, and aggregate stats
  const statsWhere = { accountId: account.id, deletedAt: null as null };

  const [
    accountsList,
    { trades, total, pages },
    strategiesList,
    tradeAgg,
    winCount,
    rrAgg,
  ] = await Promise.all([
    // 1. User accounts
    prisma.account.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, currency: true },
    }),
    // 2. Paginated trades
    TradeService.getTrades(session.user.id, filters, { page, limit }, account.id),
    // 3. Strategies for filter dropdown
    prisma.strategy.findMany({
      where: { userId: session.user.id, deletedAt: null },
      select: { id: true, name: true },
    }),
    // 4. Aggregate stats — replaces fetching ALL trades
    prisma.trade.aggregate({
      where: statsWhere,
      _count: { _all: true },
      _sum: { pnl: true },
    }),
    // 5. Win count
    prisma.trade.count({ where: { ...statsWhere, result: "WIN" } }),
    // 6. Average RR
    prisma.trade.aggregate({
      where: { ...statsWhere, rrAchieved: { not: null } },
      _avg: { rrAchieved: true },
    }),
  ]);

  const totalTradesCount = tradeAgg._count._all;
  const winRate = totalTradesCount > 0 ? (winCount / totalTradesCount) * 100 : 0;
  const totalPnl = Number(tradeAgg._sum.pnl ?? 0);
  const avgRR = Number(rrAgg._avg.rrAchieved ?? 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Trade Journal</h1>
          <p className="text-sm text-gray-400 mt-1">
            Record, analyze, and optimize every execution session
          </p>
        </div>
        <Button render={<Link href="/journal/new" />} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">
          <Plus className="h-4 w-4 mr-2" />
          New Trade
        </Button>
      </div>

      {/* Mini Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-gray-900/40 p-4 border border-gray-800 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Trades</p>
          <p className="text-2xl font-bold text-white mt-1 font-mono">{totalTradesCount}</p>
        </div>
        <div className="bg-gray-900/40 p-4 border border-gray-800 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Win Rate</p>
          <p className="text-2xl font-bold text-green-500 mt-1 font-mono">
            {winRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-gray-900/40 p-4 border border-gray-800 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Profit / Loss</p>
          <p className={`text-2xl font-bold mt-1 font-mono ${totalPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-gray-900/40 p-4 border border-gray-800 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg RR Achieved</p>
          <p className="text-2xl font-bold text-blue-500 mt-1 font-mono">{avgRR.toFixed(2)} R</p>
        </div>
      </div>

      {/* Filter Form */}
      <form method="GET" action="/journal" className="bg-gray-950 border border-gray-850 p-4 rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
          {/* Account Selector */}
          <JournalAccountSelector accounts={accountsList} currentAccountId={account.id} />

          {/* Pair Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pair</label>
            <select
              name="pair"
              defaultValue={params.pair || ""}
              className="w-full h-9 px-2 bg-gray-900 border border-gray-800 rounded text-xs text-gray-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Pairs</option>
              {TRADING_PAIRS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Session Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Session</label>
            <select
              name="session"
              defaultValue={params.session || ""}
              className="w-full h-9 px-2 bg-gray-900 border border-gray-800 rounded text-xs text-gray-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Sessions</option>
              <option value={TradingSession.LONDON}>London</option>
              <option value={TradingSession.NEW_YORK}>New York</option>
              <option value={TradingSession.ASIAN}>Asian</option>
            </select>
          </div>

          {/* Outcome Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Outcome</label>
            <select
              name="result"
              defaultValue={params.result || ""}
              className="w-full h-9 px-2 bg-gray-900 border border-gray-800 rounded text-xs text-gray-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Outcomes</option>
              <option value={TradeResult.WIN}>Win</option>
              <option value={TradeResult.LOSS}>Loss</option>
              <option value={TradeResult.BREAKEVEN}>Breakeven</option>
            </select>
          </div>

          {/* Strategy Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Strategy</label>
            <select
              name="strategyId"
              defaultValue={params.strategyId || ""}
              className="w-full h-9 px-2 bg-gray-900 border border-gray-800 rounded text-xs text-gray-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Strategies</option>
              {strategiesList.map((strat) => (
                <option key={strat.id} value={strat.id}>
                  {strat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex items-end space-x-2">
            <button
              type="submit"
              className="flex-1 h-9 bg-gray-800 hover:bg-gray-705 border border-gray-750 text-white rounded text-xs font-semibold transition"
            >
              Apply Filters
            </button>
            <Link
              href="/journal"
              className="px-3 h-9 bg-gray-950 hover:bg-gray-900 border border-gray-850 text-gray-400 hover:text-white rounded text-xs font-semibold flex items-center justify-center transition"
            >
              Clear
            </Link>
          </div>
        </div>
      </form>

      {/* Trades Table */}
      <div className="bg-gray-950 border border-gray-850 rounded-lg overflow-hidden">
        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center space-y-4">
            <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-full">
              <BookOpen className="h-8 w-8 text-gray-650" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-200">No matching trades found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                Try clearing your filters or record a new trade in your journal.
              </p>
            </div>
            <Button render={<Link href="/journal/new" />} size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">
              <Plus className="h-4 w-4 mr-1.5" />
              Journal First Trade
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-850 bg-gray-900/25">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Setup / Pair</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Direction</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Session</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Strategy</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">Risk</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Outcome</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right font-mono">P&L</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850">
                {trades.map((trade) => {
                  const tradePnl = trade.pnl ? Number(trade.pnl) : 0;
                  const isWin = trade.result === TradeResult.WIN;
                  const isLoss = trade.result === TradeResult.LOSS;
                  
                  return (
                    <tr key={trade.id} className="hover:bg-gray-900/20 transition group">
                      <td className="px-6 py-4 text-xs text-gray-400 font-mono whitespace-nowrap">
                        {new Date(trade.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-white whitespace-nowrap">
                        {trade.pair}
                      </td>
                      <td className="px-6 py-4 text-xs whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            trade.direction === Direction.LONG ? "text-blue-400" : "text-red-400"
                          }`}
                        >
                          {trade.direction}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">
                        {trade.session.replace(/_/g, " ")}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap max-w-[150px] truncate">
                        {trade.strategyVersion?.strategy.name || "--"}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-mono whitespace-nowrap">
                        {Number(trade.riskPercent)}%
                      </td>
                      <td className="px-6 py-4 text-xs whitespace-nowrap text-center">
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
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 border border-gray-800 px-2 py-0.5 rounded">
                            Open
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-right whitespace-nowrap">
                        {trade.result ? (
                          <span className={tradePnl >= 0 ? "text-green-500" : "text-red-500"}>
                            {tradePnl >= 0 ? "+" : ""}${tradePnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-gray-500">--</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-right whitespace-nowrap">
                        <Link
                          href={`/journal/${trade.id}`}
                          className="px-2.5 py-1.5 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white rounded transition text-xs font-semibold inline-block"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 bg-gray-900/10 border-t border-gray-850">
            <span className="text-xs text-gray-500">
              Page <span className="text-gray-300 font-mono">{page}</span> of{" "}
              <span className="text-gray-300 font-mono">{pages}</span>
            </span>
            <div className="flex gap-2">
              <Link
                href={{
                  query: { ...params, page: Math.max(page - 1, 1) },
                }}
                className={`px-3 py-1.5 border border-gray-850 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-900 flex items-center gap-1 transition ${
                  page === 1 ? "pointer-events-none opacity-30" : ""
                }`}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Link>
              <Link
                href={{
                  query: { ...params, page: Math.min(page + 1, pages) },
                }}
                className={`px-3 py-1.5 border border-gray-850 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-900 flex items-center gap-1 transition ${
                  page === pages ? "pointer-events-none opacity-30" : ""
                }`}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
