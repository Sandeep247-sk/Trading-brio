"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  BarChart3,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
interface DayData {
  date: string;
  netPnl: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
}

interface Summary {
  totalTrades: number;
  totalPnl: number;
  monthlyNetTotal: number;
  annualNetTotal: number;
  winRate: number;
  totalWins: number;
  totalLosses: number;
  totalBreakevens: number;
  profitFactor: number;
  avgRR: number;
  bestDay: { date: string; pnl: number } | null;
  worstDay: { date: string; pnl: number } | null;
  tradingDays: number;
}

interface CalendarData {
  days: DayData[];
  summary: Summary;
  range: { startDate: string; endDate: string };
}

type Timeframe = "week" | "month" | "year" | "all";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Helpers ────────────────────────────────────────────────────
function fmt(n: number) {
  return (n >= 0 ? "+" : "") + "$" + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(n: number) {
  if (Math.abs(n) >= 1000) {
    return (n >= 0 ? "+" : "-") + "$" + (Math.abs(n) / 1000).toFixed(1) + "k";
  }
  return fmt(n);
}

function dateLabel(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Win-rate donut SVG ─────────────────────────────────────────
function WinRateDonut({ rate, size = 120 }: { rate: number; size?: number }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const filled = (rate / 100) * c;
  return (
    <svg width={size} height={size} className="drop-shadow-lg">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={10} className="text-muted/60" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#donutGrad)" strokeWidth={10}
        strokeDasharray={`${filled} ${c - filled}`}
        strokeDashoffset={c / 4}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
      <defs>
        <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="fill-foreground text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
        {rate.toFixed(1)}%
      </text>
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function TradingCalendarPage() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch calendar data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trades/calendar?timeframe=${timeframe}&year=${year}&month=${month}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error("Calendar fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, [timeframe, year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Navigation
  const goNext = () => {
    if (timeframe === "month" || timeframe === "week") {
      if (month === 11) { setMonth(0); setYear(y => y + 1); }
      else setMonth(m => m + 1);
    } else if (timeframe === "year") {
      setYear(y => y + 1);
    }
  };
  const goPrev = () => {
    if (timeframe === "month" || timeframe === "week") {
      if (month === 0) { setMonth(11); setYear(y => y - 1); }
      else setMonth(m => m - 1);
    } else if (timeframe === "year") {
      setYear(y => y - 1);
    }
  };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); };

  // Build calendar grid cells
  const dayMap = useMemo(() => {
    const m = new Map<string, DayData>();
    data?.days.forEach(d => m.set(d.date, d));
    return m;
  }, [data]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const cells: { day: number; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[] = [];

    // Previous month padding
    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startPad - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      const pm = month === 0 ? 11 : month - 1;
      const py = month === 0 ? year - 1 : year;
      cells.push({ day: d, dateStr: `${py}-${String(pm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, isCurrentMonth: false, isToday: false });
    }

    // Current month days
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, dateStr, isCurrentMonth: true, isToday: dateStr === todayStr });
    }

    // Next month padding to fill 6 rows
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nm = month === 11 ? 0 : month + 1;
      const ny = month === 11 ? year + 1 : year;
      cells.push({ day: d, dateStr: `${ny}-${String(nm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, isCurrentMonth: false, isToday: false });
    }

    return cells;
  }, [year, month, now]);

  const s = data?.summary;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Trading Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visual overview of your daily trading performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["week", "month", "year", "all"] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200 border ${
                timeframe === tf
                  ? "bg-primary/15 text-primary border-primary/30 shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
              }`}
            >
              {tf === "all" ? "All Time" : tf}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 card-hover">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary/10"><TrendingUp className="h-3.5 w-3.5 text-primary" /></div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Monthly Net</span>
          </div>
          <p className={`text-xl font-bold font-mono ${(s?.monthlyNetTotal ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {s ? fmt(s.monthlyNetTotal) : "$0.00"}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 card-hover">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-chart-5/10"><BarChart3 className="h-3.5 w-3.5 text-chart-5" /></div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Annual Net</span>
          </div>
          <p className={`text-xl font-bold font-mono ${(s?.annualNetTotal ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {s ? fmt(s.annualNetTotal) : "$0.00"}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 card-hover">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-success/10"><Target className="h-3.5 w-3.5 text-success" /></div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Trades</span>
          </div>
          <p className="text-xl font-bold font-mono text-foreground">{s?.totalTrades ?? 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 card-hover">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-warning/10"><Trophy className="h-3.5 w-3.5 text-warning" /></div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Win Rate</span>
          </div>
          <p className="text-xl font-bold font-mono text-emerald-500">{(s?.winRate ?? 0).toFixed(1)}%</p>
        </div>
      </div>

      {/* Main Content: Calendar + Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Calendar Grid */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Calendar Nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <button onClick={goPrev} className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">
                {MONTH_NAMES[month]} {year}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={goToday} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition">
                Today
              </button>
              <button onClick={goNext} className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="py-2.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          {/* Day Cells */}
          {loading ? (
            <div className="grid grid-cols-7">
              {Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="aspect-square border-b border-r border-border/50 p-2">
                  <div className="h-3 w-6 bg-muted/50 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {calendarCells.map((cell, i) => {
                const dayData = dayMap.get(cell.dateStr);
                const hasTrades = dayData && dayData.tradeCount > 0;
                const isProfit = hasTrades && dayData.netPnl > 0;
                const isLoss = hasTrades && dayData.netPnl < 0;

                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (cell.isCurrentMonth) {
                        router.push(`/journal?date=${cell.dateStr}`);
                      }
                    }}
                    className={`relative aspect-square border-b border-r border-border/50 p-1.5 sm:p-2 text-left transition-all duration-200 group ${
                      !cell.isCurrentMonth
                        ? "opacity-30 cursor-default"
                        : "cursor-pointer hover:bg-muted/30"
                    } ${
                      isProfit
                        ? "bg-emerald-500/8 hover:bg-emerald-500/15"
                        : isLoss
                        ? "bg-rose-500/8 hover:bg-rose-500/15"
                        : ""
                    }`}
                  >
                    {/* Day number */}
                    <span
                      className={`text-xs font-semibold block ${
                        cell.isToday
                          ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-[11px]"
                          : cell.isCurrentMonth
                          ? "text-foreground/70"
                          : "text-muted-foreground/40"
                      }`}
                    >
                      {cell.day}
                    </span>

                    {/* Trade info */}
                    {hasTrades && cell.isCurrentMonth && (
                      <div className="mt-1 space-y-0.5">
                        <span
                          className={`block text-[11px] sm:text-xs font-bold font-mono leading-tight ${
                            isProfit ? "text-emerald-500" : isLoss ? "text-rose-500" : "text-muted-foreground"
                          }`}
                        >
                          {fmtShort(dayData.netPnl)}
                        </span>
                        <span className="block text-[9px] sm:text-[10px] text-muted-foreground font-medium">
                          {dayData.tradeCount} trade{dayData.tradeCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}

                    {/* Hover indicator */}
                    {cell.isCurrentMonth && hasTrades && (
                      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowUpRight className="h-3 w-3 text-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Statistics Panel */}
        <div className="space-y-4">
          {/* Win Rate Card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Win Rate</h3>
            <div className="flex justify-center mb-4">
              <WinRateDonut rate={s?.winRate ?? 0} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-500/10 rounded-lg p-2">
                <p className="text-lg font-bold text-emerald-500 font-mono">{s?.totalWins ?? 0}</p>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase">Wins</p>
              </div>
              <div className="bg-rose-500/10 rounded-lg p-2">
                <p className="text-lg font-bold text-rose-500 font-mono">{s?.totalLosses ?? 0}</p>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase">Losses</p>
              </div>
              <div className="bg-amber-500/10 rounded-lg p-2">
                <p className="text-lg font-bold text-amber-500 font-mono">{s?.totalBreakevens ?? 0}</p>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase">BE</p>
              </div>
            </div>
          </div>

          {/* Daily Performance Card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Daily Performance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/15">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-emerald-500/15"><ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" /></div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Best Day</p>
                    <p className="text-[10px] text-muted-foreground">{s?.bestDay ? dateLabel(s.bestDay.date) : "—"}</p>
                  </div>
                </div>
                <p className="text-sm font-bold font-mono text-emerald-500">{s?.bestDay ? fmt(s.bestDay.pnl) : "—"}</p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-rose-500/8 border border-rose-500/15">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-rose-500/15"><ArrowDownRight className="h-3.5 w-3.5 text-rose-500" /></div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Worst Day</p>
                    <p className="text-[10px] text-muted-foreground">{s?.worstDay ? dateLabel(s.worstDay.date) : "—"}</p>
                  </div>
                </div>
                <p className="text-sm font-bold font-mono text-rose-500">{s?.worstDay ? fmt(s.worstDay.pnl) : "—"}</p>
              </div>
            </div>
          </div>

          {/* Trade Performance Card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Trade Performance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Profit Factor</span>
                <span className="text-sm font-bold font-mono text-foreground">
                  {s ? (s.profitFactor >= 999 ? "∞" : s.profitFactor.toFixed(2)) : "0.00"}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Avg R:R</span>
                <span className="text-sm font-bold font-mono text-foreground">{(s?.avgRR ?? 0).toFixed(2)} R</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Trading Days</span>
                <span className="text-sm font-bold font-mono text-foreground">{s?.tradingDays ?? 0}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Period P&L</span>
                <span className={`text-sm font-bold font-mono ${(s?.totalPnl ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {s ? fmt(s.totalPnl) : "$0.00"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
