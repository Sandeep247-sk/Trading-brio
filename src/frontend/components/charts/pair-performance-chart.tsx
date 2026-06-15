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

const CustomTooltip = ({ active, payload, currency }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-gray-950/95 border border-gray-800 rounded-lg px-3 py-2.5 shadow-xl backdrop-blur-sm space-y-1">
      <p className="text-[11px] font-bold text-gray-200">{data.pair}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
        <p className="text-gray-500">Trades: <span className="text-gray-300 font-mono">{data.trades}</span></p>
        <p className="text-gray-500">Win Rate: <span className="text-green-400 font-mono">{data.winRate.toFixed(1)}%</span></p>
        <p className="text-gray-500">Wins: <span className="text-green-400 font-mono">{data.wins}</span></p>
        <p className="text-gray-500">Losses: <span className="text-red-400 font-mono">{data.losses}</span></p>
        <p className="text-gray-500">Avg RR: <span className="text-blue-400 font-mono">{data.avgRR.toFixed(2)}R</span></p>
        <p className={`font-mono font-bold ${data.netPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
          {formatCurrency(data.netPnl, currency)}
        </p>
      </div>
    </div>
  );
};

export function PairPerformanceChart({ data, currency = "USD" }: PairPerformanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500 text-xs">
        No pair data to display
      </div>
    );
  }

  const chartHeight = Math.max(200, data.length * 40 + 30);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "#6b7280", fontSize: 10 }}
          tickLine={{ stroke: "#1a1f2e" }}
          axisLine={{ stroke: "#1a1f2e" }}
          tickFormatter={(val) => formatCurrency(val, currency)}
        />
        <YAxis
          dataKey="pair"
          type="category"
          tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 600 }}
          tickLine={false}
          axisLine={{ stroke: "#1a1f2e" }}
          width={80}
        />
        <Tooltip content={<CustomTooltip currency={currency} />} />
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
