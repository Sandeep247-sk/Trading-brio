"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Calendar,
  Activity,
  DollarSign,
  Search,
  Filter,
} from "lucide-react";
import Link from "next/link";

interface ViolationsListProps {
  violations: any[];
}

export function ViolationsList({ violations }: ViolationsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Get unique categories for filtering
  const categories = useMemo(() => {
    const list = new Set<string>();
    violations.forEach((v) => {
      if (v.category?.name) list.add(v.category.name);
    });
    return Array.from(list);
  }, [violations]);

  // Filtered violations
  const filteredViolations = useMemo(() => {
    return violations.filter((v) => {
      const matchesSearch =
        v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.category?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.trade?.pair && v.trade.pair.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSeverity =
        severityFilter === "ALL" || v.category?.severity === severityFilter;

      const matchesCategory =
        categoryFilter === "ALL" || v.category?.name === categoryFilter;

      return matchesSearch && matchesSeverity && matchesCategory;
    });
  }, [violations, searchQuery, severityFilter, categoryFilter]);

  // Statistics
  const stats = useMemo(() => {
    let totalPlImpact = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    violations.forEach((v) => {
      totalPlImpact += v.plImpact ? Number(v.plImpact) : 0;
      const severity = v.category?.severity;
      if (severity === "CRITICAL") criticalCount++;
      else if (severity === "HIGH") highCount++;
      else if (severity === "MEDIUM") mediumCount++;
      else if (severity === "LOW") lowCount++;
    });

    // Determine discipline grade
    let grade = "A+";
    let gradeColor = "text-green-400 border-green-500/20 bg-green-500/5";
    const penaltyScore = criticalCount * 25 + highCount * 15 + mediumCount * 8 + lowCount * 3;

    if (penaltyScore === 0) {
      grade = "A+";
      gradeColor = "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
    } else if (penaltyScore <= 10) {
      grade = "A";
      gradeColor = "text-green-400 border-green-500/20 bg-green-500/5";
    } else if (penaltyScore <= 20) {
      grade = "B";
      gradeColor = "text-blue-400 border-blue-500/20 bg-blue-500/5";
    } else if (penaltyScore <= 40) {
      grade = "C";
      gradeColor = "text-yellow-400 border-yellow-500/20 bg-yellow-500/5";
    } else if (penaltyScore <= 60) {
      grade = "D";
      gradeColor = "text-orange-400 border-orange-500/20 bg-orange-500/5";
    } else {
      grade = "F";
      gradeColor = "text-red-400 border-red-500/20 bg-red-500/5";
    }

    return {
      totalPlImpact,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      grade,
      gradeColor,
      penaltyScore,
    };
  }, [violations]);

  // Helpers for styling
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-950/40 text-red-400 border-red-800/30";
      case "HIGH":
        return "bg-orange-950/40 text-orange-400 border-orange-800/30";
      case "MEDIUM":
        return "bg-amber-950/40 text-amber-400 border-amber-800/30";
      case "LOW":
        return "bg-blue-950/40 text-blue-400 border-blue-800/30";
      default:
        return "bg-gray-950/40 text-gray-400 border-gray-800/30";
    }
  };

  const getSeverityLeftBorder = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "border-l-4 border-l-red-500";
      case "HIGH":
        return "border-l-4 border-l-orange-500";
      case "MEDIUM":
        return "border-l-4 border-l-amber-500";
      case "LOW":
        return "border-l-4 border-l-blue-500";
      default:
        return "border-l-4 border-l-gray-750";
    }
  };

  const formatCurrency = (val: number) => {
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(absVal);
    return isNeg ? `-${formatted}` : formatted;
  };

  return (
    <div className="space-y-6">
      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Count */}
        <div className="glass-card p-5 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Violations</p>
            <p className="text-3xl font-bold font-mono tracking-tight text-white">{violations.length}</p>
          </div>
          <div className="h-10 w-10 bg-red-950/30 border border-red-900/20 rounded-lg flex items-center justify-center text-red-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        {/* PnL Cost */}
        <div className="glass-card p-5 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">P&L Cost / Leakage</p>
            <p className={`text-3xl font-bold font-mono tracking-tight ${stats.totalPlImpact < 0 ? "text-red-400" : "text-gray-300"}`}>
              {formatCurrency(stats.totalPlImpact)}
            </p>
          </div>
          <div className={`h-10 w-10 border rounded-lg flex items-center justify-center ${stats.totalPlImpact < 0 ? "bg-red-950/30 border-red-900/20 text-red-400" : "bg-gray-950 border-gray-800 text-gray-400"}`}>
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>

        {/* Discipline Grade */}
        <div className="glass-card p-5 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Discipline Grade</p>
            <p className="text-3xl font-bold font-mono tracking-tight text-white">{stats.grade}</p>
          </div>
          <div className={`h-10 w-10 border rounded-lg flex items-center justify-center font-bold text-sm ${stats.gradeColor}`}>
            {stats.grade}
          </div>
        </div>

        {/* Severity counts */}
        <div className="glass-card p-4 rounded-lg flex flex-col justify-between space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Severity Breakdown</p>
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold font-mono">
            <div className="bg-red-950/20 border border-red-900/30 p-1.5 rounded text-red-400">
              <span className="block text-[8px] text-red-500 uppercase">Crit</span>
              {stats.criticalCount}
            </div>
            <div className="bg-orange-950/20 border border-orange-900/30 p-1.5 rounded text-orange-400">
              <span className="block text-[8px] text-orange-500 uppercase">High</span>
              {stats.highCount}
            </div>
            <div className="bg-amber-950/20 border border-amber-900/30 p-1.5 rounded text-amber-400">
              <span className="block text-[8px] text-amber-500 uppercase">Med</span>
              {stats.mediumCount}
            </div>
            <div className="bg-blue-950/20 border border-blue-900/30 p-1.5 rounded text-blue-400">
              <span className="block text-[8px] text-blue-500 uppercase">Low</span>
              {stats.lowCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="glass-card p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search violations, assets, descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-gray-950 border border-gray-850 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Dropdown filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Severity */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-gray-500" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-10 px-3 bg-gray-950 border border-gray-850 rounded text-xs text-gray-300 focus:outline-none focus:border-blue-500 font-semibold"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Severity</option>
              <option value="MEDIUM">Medium Severity</option>
              <option value="LOW">Low Severity</option>
            </select>
          </div>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 px-3 bg-gray-950 border border-gray-850 rounded text-xs text-gray-300 focus:outline-none focus:border-blue-500 font-semibold"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of violations */}
      {filteredViolations.length === 0 ? (
        <div className="glass-card p-12 rounded-lg text-center flex flex-col items-center justify-center space-y-4">
          <div className="h-16 w-16 bg-emerald-950/20 border border-emerald-900/30 rounded-full flex items-center justify-center text-emerald-400">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div className="max-w-sm space-y-2">
            <h3 className="text-lg font-bold text-white">All Clear! No Violations Found</h3>
            <p className="text-sm text-gray-400">
              {violations.length > 0
                ? "No violations match your current filters. Try relaxing them!"
                : "You have 100% strategy compliance and risk discipline on this account. Keep it up!"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredViolations.map((v) => (
            <div
              key={v.id}
              className={`glass-card p-5 rounded-lg flex flex-col justify-between hover:border-gray-750 transition duration-200 glow-blue ${getSeverityLeftBorder(
                v.category?.severity
              )}`}
            >
              <div className="space-y-3">
                {/* Header: Category & Severity */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                      {v.detectedBy} DETECTED
                    </span>
                    <h4 className="text-sm font-bold text-white">{v.category?.name}</h4>
                  </div>
                  <span
                    className={`px-2 py-0.5 border rounded-full text-[9px] font-bold tracking-wide ${getSeverityBadge(
                      v.category?.severity
                    )}`}
                  >
                    {v.category?.severity}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-300 leading-relaxed">{v.description}</p>

                {/* Trade details if any */}
                {v.trade && (
                  <div className="bg-gray-950/50 border border-gray-900 rounded-md p-3 flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-200">{v.trade.pair}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 rounded ${
                            v.trade.direction === "LONG"
                              ? "text-green-400 bg-green-500/10"
                              : "text-red-400 bg-red-500/10"
                          }`}
                        >
                          {v.trade.direction}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500 font-mono text-[10px]">
                        <Calendar className="h-3 w-3" />
                        {new Date(v.trade.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div
                        className={`font-mono font-bold ${
                          v.trade.pnl > 0
                            ? "text-green-400"
                            : v.trade.pnl < 0
                            ? "text-red-400"
                            : "text-gray-400"
                        }`}
                      >
                        {v.trade.pnl > 0 ? "+" : ""}
                        {v.trade.pnl !== null ? formatCurrency(v.trade.pnl) : "$0.00"}
                      </div>
                      <Link
                        href={`/journal?tradeId=${v.trade.id}`}
                        className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition"
                      >
                        View Journal
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer: Date & PL Impact */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-900/60 text-xs">
                <span className="text-gray-500 font-mono text-[10px]">
                  Detected: {new Date(v.createdAt).toLocaleDateString()}
                </span>
                {v.plImpact !== null && v.plImpact !== undefined && (
                  <div className="flex items-center gap-1 font-semibold text-gray-400">
                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wide">P&L Impact:</span>
                    <span className={Number(v.plImpact) < 0 ? "text-red-400 font-mono" : "text-gray-300 font-mono"}>
                      {formatCurrency(Number(v.plImpact))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
