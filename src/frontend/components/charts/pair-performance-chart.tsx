"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useChartTheme } from "./use-chart-theme";

interface PairData {
  pair: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnl: number;
  avgRR: number;
}

interface PairPerformanceChartProps {
  data: PairData[];
  currency?: string;
}

const formatCurrency = (val: number, currency = "USD") => {
  const symbol = currency === "INR" ? "₹" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  return `${val >= 0 ? "+" : "-"}${symbol}${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

function ChartTooltip({ active, payload, currency, theme }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div
      className="rounded-lg px-3 py-2.5 shadow-xl backdrop-blur-sm space-y-1"
      style={{
        background: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
        color: theme.tooltipText,
      }}
    >
      <p className="text-[11px] font-bold" style={{ color: theme.tooltipText }}>{data.pair}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
        <p style={{ color: theme.tooltipMuted }}>Trades: <span className="font-mono" style={{ color: theme.tooltipText }}>{data.trades}</span></p>
        <p style={{ color: theme.tooltipMuted }}>Win Rate: <span className="text-green-500 font-mono">{data.winRate.toFixed(1)}%</span></p>
        <p style={{ color: theme.tooltipMuted }}>Wins: <span className="text-green-500 font-mono">{data.wins}</span></p>
        <p style={{ color: theme.tooltipMuted }}>Losses: <span className="text-red-500 font-mono">{data.losses}</span></p>
        <p style={{ color: theme.tooltipMuted }}>Avg RR: <span className="text-blue-500 font-mono">{data.avgRR.toFixed(2)}R</span></p>
        <p className={`font-mono font-bold ${data.netPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
          {formatCurrency(data.netPnl, currency)}
        </p>
      </div>
    </div>
  );
}

export function PairPerformanceChart({ data, currency = "USD" }: PairPerformanceChartProps) {
  const theme = useChartTheme();

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-xs">
        No pair data to display
      </div>
    );
  }

  const chartHeight = Math.max(200, data.length * 40 + 30);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: theme.tick, fontSize: 10 }}
          tickLine={{ stroke: theme.axis }}
          axisLine={{ stroke: theme.axis }}
          tickFormatter={(val) => formatCurrency(val, currency)}
        />
        <YAxis
          dataKey="pair"
          type="category"
          tick={{ fill: theme.tick, fontSize: 11, fontWeight: 600 }}
          tickLine={false}
          axisLine={{ stroke: theme.axis }}
          width={80}
        />
        <Tooltip content={<ChartTooltip currency={currency} theme={theme} />} />
        <Bar dataKey="netPnl" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.netPnl >= 0 ? "#22c55e" : "#ef4444"}
              fillOpacity={0.75}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
