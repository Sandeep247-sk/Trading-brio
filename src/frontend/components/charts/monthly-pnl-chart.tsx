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
  ReferenceLine,
} from "recharts";
import { useChartTheme } from "./use-chart-theme";

interface MonthlyPnlData {
  month: string;
  label: string;
  profit: number;
  loss: number;
  net: number;
  trades: number;
}

interface MonthlyPnlChartProps {
  data: MonthlyPnlData[];
  currency?: string;
}

const formatCurrency = (val: number, currency = "USD") => {
  const symbol = currency === "INR" ? "₹" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  return `${symbol}${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
      <p className="text-[11px] font-semibold" style={{ color: theme.tooltipText }}>{data.label}</p>
      <div className="space-y-0.5">
        <p className="text-[10px]" style={{ color: theme.tooltipMuted }}>
          Trades: <span className="font-mono" style={{ color: theme.tooltipText }}>{data.trades}</span>
        </p>
        <p className="text-[10px] text-green-500 font-mono">
          Profit: +{formatCurrency(data.profit, currency)}
        </p>
        <p className="text-[10px] text-red-500 font-mono">
          Loss: -{formatCurrency(Math.abs(data.loss), currency)}
        </p>
        <p className={`text-xs font-bold font-mono ${data.net >= 0 ? "text-green-500" : "text-red-500"}`}>
          Net: {data.net >= 0 ? "+" : "-"}{formatCurrency(data.net, currency)}
        </p>
      </div>
    </div>
  );
}

export function MonthlyPnlChart({ data, currency = "USD" }: MonthlyPnlChartProps) {
  const theme = useChartTheme();

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-xs">
        No monthly data to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
        <XAxis
          dataKey="label"
          tick={{ fill: theme.tick, fontSize: 10 }}
          tickLine={{ stroke: theme.axis }}
          axisLine={{ stroke: theme.axis }}
        />
        <YAxis
          tick={{ fill: theme.tick, fontSize: 10 }}
          tickLine={{ stroke: theme.axis }}
          axisLine={{ stroke: theme.axis }}
          tickFormatter={(val) => `${val >= 0 ? "+" : "-"}${formatCurrency(val, currency)}`}
          width={75}
        />
        <Tooltip content={<ChartTooltip currency={currency} theme={theme} />} />
        <ReferenceLine y={0} stroke={theme.reference} />
        <Bar dataKey="net" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.net >= 0 ? "#22c55e" : "#ef4444"}
              fillOpacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
