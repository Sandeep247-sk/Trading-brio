"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";
import { useChartTheme } from "./use-chart-theme";

interface EquityPoint {
  date: string;
  balance: number;
  pnl: number;
}

interface EquityCurveProps {
  data: EquityPoint[];
  currency?: string;
  mini?: boolean;
}

const formatCurrency = (val: number, currency = "USD") => {
  const symbol = currency === "INR" ? "₹" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  return `${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

function ChartTooltip({ active, payload, label, currency, theme }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm text-sm"
      style={{
        background: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
        color: theme.tooltipText,
      }}
    >
      <p className="text-[10px] font-mono" style={{ color: theme.tooltipMuted }}>{label}</p>
      <p className="text-sm font-bold font-mono" style={{ color: theme.tooltipText }}>
        {formatCurrency(payload[0].value, currency)}
      </p>
      {payload[0].payload.pnl !== 0 && (
        <p className={`text-[10px] font-mono ${payload[0].payload.pnl > 0 ? "text-green-500" : "text-red-500"}`}>
          {payload[0].payload.pnl > 0 ? "+" : ""}
          {formatCurrency(payload[0].payload.pnl, currency)}
        </p>
      )}
    </div>
  );
}

export function EquityCurve({ data, currency = "USD", mini = false }: EquityCurveProps) {
  const theme = useChartTheme();

  if (data.length < 2) {
    return (
      <div className={`flex items-center justify-center text-muted-foreground text-xs ${mini ? "h-[120px]" : "h-[300px]"}`}>
        Not enough data to display equity curve
      </div>
    );
  }

  const startBalance = data[0]?.balance ?? 0;
  const endBalance = data[data.length - 1]?.balance ?? 0;
  const isPositive = endBalance >= startBalance;
  const gradientColor = isPositive ? "#22c55e" : "#ef4444";
  const lineColor = isPositive ? "#4ade80" : "#f87171";

  if (mini) {
    return (
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="equityGradientMini" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="balance"
            stroke={lineColor}
            strokeWidth={2}
            fill="url(#equityGradientMini)"
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={gradientColor} stopOpacity={0.25} />
            <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
        <XAxis
          dataKey="date"
          tick={{ fill: theme.tick, fontSize: 10 }}
          tickLine={{ stroke: theme.axis }}
          axisLine={{ stroke: theme.axis }}
          tickFormatter={(val) => {
            const d = new Date(val);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          }}
        />
        <YAxis
          tick={{ fill: theme.tick, fontSize: 10 }}
          tickLine={{ stroke: theme.axis }}
          axisLine={{ stroke: theme.axis }}
          tickFormatter={(val) => formatCurrency(val, currency)}
          width={75}
        />
        <Tooltip content={<ChartTooltip currency={currency} theme={theme} />} />
        <ReferenceLine y={startBalance} stroke={theme.reference} strokeDasharray="5 5" />
        <Area
          type="monotone"
          dataKey="balance"
          stroke={lineColor}
          strokeWidth={2}
          fill="url(#equityGradient)"
          dot={false}
          activeDot={{ r: 4, fill: lineColor, stroke: theme.activeDotStroke, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
