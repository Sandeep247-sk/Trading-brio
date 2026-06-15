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

interface DistributionData {
  range: string;
  count: number;
}

interface PnlDistributionChartProps {
  data: DistributionData[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-950/95 border border-gray-800 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-[10px] font-semibold text-gray-300">{payload[0].payload.range}</p>
      <p className="text-sm font-bold text-gray-200 font-mono">{payload[0].value} trades</p>
    </div>
  );
};

export function PnlDistributionChart({ data }: PnlDistributionChartProps) {
  const hasData = data.some((d) => d.count > 0);
  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[250px] text-gray-500 text-xs">
        No distribution data to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" />
        <XAxis
          dataKey="range"
          tick={{ fill: "#6b7280", fontSize: 9 }}
          tickLine={{ stroke: "#1a1f2e" }}
          axisLine={{ stroke: "#1a1f2e" }}
          angle={-25}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fill: "#6b7280", fontSize: 10 }}
          tickLine={{ stroke: "#1a1f2e" }}
          axisLine={{ stroke: "#1a1f2e" }}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={35}>
          {data.map((entry, index) => {
            const isNegativeRange = entry.range.includes("-$") || entry.range.startsWith("< ");
            return (
              <Cell
                key={`cell-${index}`}
                fill={isNegativeRange ? "#ef4444" : "#22c55e"}
                fillOpacity={0.7}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
