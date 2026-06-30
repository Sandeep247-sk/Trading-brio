"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useChartTheme } from "./use-chart-theme";

interface SessionData {
  session: string;
  trades: number;
  wins: number;
  winRate: number;
  pnl: number;
  percentage: number;
}

interface SessionPieChartProps {
  data: SessionData[];
  currency?: string;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b"];
const SESSION_LABELS: Record<string, string> = {
  "LONDON": "London",
  "NEW YORK": "New York",
  "ASIAN": "Asian",
};

const formatCurrency = (val: number, currency = "USD") => {
  const symbol = currency === "INR" ? "₹" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  return `${val >= 0 ? "+" : "-"}${symbol}${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

function ChartTooltip({ active, payload, currency, theme }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div
      className="rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm space-y-0.5"
      style={{
        background: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
        color: theme.tooltipText,
      }}
    >
      <p className="text-[11px] font-bold" style={{ color: theme.tooltipText }}>{data.session}</p>
      <p className="text-[10px]" style={{ color: theme.tooltipMuted }}>
        Trades: <span className="font-mono" style={{ color: theme.tooltipText }}>{data.trades}</span> ({data.percentage.toFixed(1)}%)
      </p>
      <p className="text-[10px]" style={{ color: theme.tooltipMuted }}>
        Win Rate: <span className="text-green-500 font-mono">{data.winRate.toFixed(1)}%</span>
      </p>
      <p className={`text-[10px] font-mono font-bold ${data.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
        {formatCurrency(data.pnl, currency)}
      </p>
    </div>
  );
}

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null; // Don't render labels for tiny slices
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function SessionPieChart({ data, currency = "USD" }: SessionPieChartProps) {
  const theme = useChartTheme();

  const hasData = data.some((d) => d.trades > 0);
  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[280px] text-muted-foreground text-xs">
        No session data to display
      </div>
    );
  }

  const activeData = data.filter((d) => d.trades > 0);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={activeData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={100}
          innerRadius={55}
          fill="#8884d8"
          dataKey="trades"
          strokeWidth={2}
          stroke={theme.pieStroke}
        >
          {activeData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip currency={currency} theme={theme} />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          content={({ payload }: any) => (
            <div className="flex items-center justify-center gap-4 mt-2">
              {payload?.map((entry: any, index: number) => (
                <div key={`legend-${index}`} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-[10px] text-muted-foreground font-medium">{entry.value}</span>
                </div>
              ))}
            </div>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
