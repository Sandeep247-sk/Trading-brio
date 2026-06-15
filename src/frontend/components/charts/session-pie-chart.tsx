"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

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

const CustomTooltip = ({ active, payload, currency }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-gray-950/95 border border-gray-800 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm space-y-0.5">
      <p className="text-[11px] font-bold text-gray-200">{data.session}</p>
      <p className="text-[10px] text-gray-500">
        Trades: <span className="text-gray-300 font-mono">{data.trades}</span> ({data.percentage.toFixed(1)}%)
      </p>
      <p className="text-[10px] text-gray-500">
        Win Rate: <span className="text-green-400 font-mono">{data.winRate.toFixed(1)}%</span>
      </p>
      <p className={`text-[10px] font-mono font-bold ${data.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
        {formatCurrency(data.pnl, currency)}
      </p>
    </div>
  );
};

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
  const hasData = data.some((d) => d.trades > 0);
  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[280px] text-gray-500 text-xs">
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
          stroke="#0f1419"
        >
          {activeData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip currency={currency} />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          content={({ payload }: any) => (
            <div className="flex items-center justify-center gap-4 mt-2">
              {payload?.map((entry: any, index: number) => (
                <div key={`legend-${index}`} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-[10px] text-gray-400 font-medium">{entry.value}</span>
                </div>
              ))}
            </div>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
