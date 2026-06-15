"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";

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

const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-950/95 border border-gray-800 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-[10px] text-gray-500 font-mono">{label}</p>
      <p className="text-sm font-bold text-gray-200 font-mono">
        {formatCurrency(payload[0].value, currency)}
      </p>
      {payload[0].payload.pnl !== 0 && (
        <p className={`text-[10px] font-mono ${payload[0].payload.pnl > 0 ? "text-green-400" : "text-red-400"}`}>
          {payload[0].payload.pnl > 0 ? "+" : ""}
          {formatCurrency(payload[0].payload.pnl, currency)}
        </p>
      )}
    </div>
  );
};

export function EquityCurve({ data, currency = "USD", mini = false }: EquityCurveProps) {
  if (data.length < 2) {
    return (
      <div className={`flex items-center justify-center text-gray-500 text-xs ${mini ? "h-[120px]" : "h-[300px]"}`}>
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
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#6b7280", fontSize: 10 }}
          tickLine={{ stroke: "#1a1f2e" }}
          axisLine={{ stroke: "#1a1f2e" }}
          tickFormatter={(val) => {
            const d = new Date(val);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          }}
        />
        <YAxis
          tick={{ fill: "#6b7280", fontSize: 10 }}
          tickLine={{ stroke: "#1a1f2e" }}
          axisLine={{ stroke: "#1a1f2e" }}
          tickFormatter={(val) => formatCurrency(val, currency)}
          width={75}
        />
        <Tooltip content={<CustomTooltip currency={currency} />} />
        <ReferenceLine y={startBalance} stroke="#374151" strokeDasharray="5 5" />
        <Area
          type="monotone"
          dataKey="balance"
          stroke={lineColor}
          strokeWidth={2}
          fill="url(#equityGradient)"
          dot={false}
          activeDot={{ r: 4, fill: lineColor, stroke: "#0f1419", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
