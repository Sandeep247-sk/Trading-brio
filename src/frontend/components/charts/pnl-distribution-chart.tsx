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

interface DistributionData {
  range: string;
  count: number;
}

interface PnlDistributionChartProps {
  data: DistributionData[];
}

function ChartTooltip({ active, payload, theme }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm"
      style={{
        background: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
        color: theme.tooltipText,
      }}
    >
      <p className="text-[10px] font-semibold" style={{ color: theme.tooltipText }}>{payload[0].payload.range}</p>
      <p className="text-sm font-bold font-mono" style={{ color: theme.tooltipText }}>{payload[0].value} trades</p>
    </div>
  );
}

export function PnlDistributionChart({ data }: PnlDistributionChartProps) {
  const theme = useChartTheme();

  const hasData = data.some((d) => d.count > 0);
  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground text-xs">
        No distribution data to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
        <XAxis
          dataKey="range"
          tick={{ fill: theme.tick, fontSize: 9 }}
          tickLine={{ stroke: theme.axis }}
          axisLine={{ stroke: theme.axis }}
          angle={-25}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fill: theme.tick, fontSize: 10 }}
          tickLine={{ stroke: theme.axis }}
          axisLine={{ stroke: theme.axis }}
          allowDecimals={false}
        />
        <Tooltip content={<ChartTooltip theme={theme} />} />
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
