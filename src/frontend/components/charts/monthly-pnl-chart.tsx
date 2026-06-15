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

const CustomTooltip = ({ active, payload, currency }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-gray-950/95 border border-gray-800 rounded-lg px-3 py-2.5 shadow-xl backdrop-blur-sm space-y-1">
      <p className="text-[11px] font-semibold text-gray-300">{data.label}</p>
      <div className="space-y-0.5">
        <p className="text-[10px] text-gray-500">
          Trades: <span className="text-gray-300 font-mono">{data.trades}</span>
        </p>
        <p className="text-[10px] text-green-400 font-mono">
          Profit: +{formatCurrency(data.profit, currency)}
        </p>
        <p className="text-[10px] text-red-400 font-mono">
          Loss: -{formatCurrency(Math.abs(data.loss), currency)}
        </p>
        <p className={`text-xs font-bold font-mono ${data.net >= 0 ? "text-green-400" : "text-red-400"}`}>
          Net: {data.net >= 0 ? "+" : "-"}{formatCurrency(data.net, currency)}
        </p>
      </div>
    </div>
  );
};

export function MonthlyPnlChart({ data, currency = "USD" }: MonthlyPnlChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500 text-xs">
        No monthly data to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" />
        <XAxis
          dataKey="label"
          tick={{ fill: "#6b7280", fontSize: 10 }}
          tickLine={{ stroke: "#1a1f2e" }}
          axisLine={{ stroke: "#1a1f2e" }}
        />
        <YAxis
          tick={{ fill: "#6b7280", fontSize: 10 }}
          tickLine={{ stroke: "#1a1f2e" }}
          axisLine={{ stroke: "#1a1f2e" }}
          tickFormatter={(val) => `${val >= 0 ? "+" : "-"}${formatCurrency(val, currency)}`}
          width={75}
        />
        <Tooltip content={<CustomTooltip currency={currency} />} />
        <ReferenceLine y={0} stroke="#374151" />
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
