"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Returns theme-aware chart styling values.
 * Falls back to dark mode values until mounted.
 */
export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = !mounted || resolvedTheme === "dark";

  return {
    grid: isDark ? "#1a1f2e" : "#E5E7EB",
    tick: "#6b7280",
    axis: isDark ? "#1a1f2e" : "#E5E7EB",
    reference: isDark ? "#374151" : "#D1D5DB",
    tooltipBg: isDark ? "rgba(10,14,25,0.95)" : "rgba(255,255,255,0.97)",
    tooltipBorder: isDark ? "#1f2937" : "#e2e8f0",
    tooltipText: isDark ? "#e2e8f0" : "#111827",
    tooltipMuted: "#6b7280",
    pieStroke: isDark ? "#0f1419" : "#ffffff",
    activeDotStroke: isDark ? "#0f1419" : "#ffffff",
    isDark,
  };
}
