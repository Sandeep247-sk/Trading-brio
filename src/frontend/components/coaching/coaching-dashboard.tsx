"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Brain,
  Shield,
  Target,
  Activity,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Award,
  Flame,
  Zap,
} from "lucide-react";

interface BehaviorScoreData {
  period: string;
  periodType: "WEEKLY" | "MONTHLY";
  disciplineScore: number;
  complianceScore: number;
  consistencyScore: number;
  totalTrades: number;
  compositeScore: number;
}

interface CoachingInsight {
  type: "warning" | "tip" | "achievement";
  title: string;
  description: string;
  metric?: string;
}

interface CoachingDashboardProps {
  currentScore: BehaviorScoreData;
  trend: BehaviorScoreData[];
  insights: CoachingInsight[];
  violationCount: number;
  totalTrades30d: number;
}

export function CoachingDashboard({
  currentScore,
  trend,
  insights,
  violationCount,
  totalTrades30d,
}: CoachingDashboardProps) {
  const gradeInfo = useMemo(() => {
    const score = currentScore.compositeScore;
    if (score >= 95) return { grade: "A+", color: "text-emerald-400", ring: "stroke-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
    if (score >= 85) return { grade: "A", color: "text-green-400", ring: "stroke-green-400", bg: "bg-green-500/10 border-green-500/20" };
    if (score >= 70) return { grade: "B", color: "text-blue-400", ring: "stroke-blue-400", bg: "bg-blue-500/10 border-blue-500/20" };
    if (score >= 55) return { grade: "C", color: "text-yellow-400", ring: "stroke-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" };
    if (score >= 40) return { grade: "D", color: "text-orange-400", ring: "stroke-orange-400", bg: "bg-orange-500/10 border-orange-500/20" };
    return { grade: "F", color: "text-red-400", ring: "stroke-red-400", bg: "bg-red-500/10 border-red-500/20" };
  }, [currentScore.compositeScore]);

  const circumference = 2 * Math.PI * 54;
  const scoreOffset = circumference - (currentScore.compositeScore / 100) * circumference;

  // Streak: count consecutive periods with compositeScore >= 70
  const streakCount = useMemo(() => {
    let count = 0;
    for (let i = trend.length - 1; i >= 0; i--) {
      if (trend[i].compositeScore >= 70) count++;
      else break;
    }
    return count;
  }, [trend]);

  return (
    <div className="space-y-6">
      {/* Top Row: Score Ring + Score Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Composite Score Ring */}
        <div className="glass-card p-6 rounded-lg flex flex-col items-center justify-center text-center space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Composite Score
          </p>
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                stroke="currentColor"
                className="text-gray-800"
                strokeWidth="8"
              />
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                className={gradeInfo.ring}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={scoreOffset}
                style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold font-mono ${gradeInfo.color}`}>
                {currentScore.compositeScore}
              </span>
              <span className="text-[10px] text-gray-500 font-semibold uppercase">
                / 100
              </span>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full border text-xs font-bold ${gradeInfo.bg} ${gradeInfo.color}`}>
            Grade: {gradeInfo.grade}
          </div>
        </div>

        {/* Discipline */}
        <ScoreCard
          title="Discipline"
          score={currentScore.disciplineScore}
          icon={<Shield className="h-4 w-4" />}
          description="Fewer violations = higher score"
          color="blue"
          weight="40%"
        />

        {/* Compliance */}
        <ScoreCard
          title="Compliance"
          score={currentScore.complianceScore}
          icon={<Target className="h-4 w-4" />}
          description="Strategy checklist adherence"
          color="purple"
          weight="35%"
        />

        {/* Consistency */}
        <ScoreCard
          title="Consistency"
          score={currentScore.consistencyScore}
          icon={<Activity className="h-4 w-4" />}
          description="Lower P&L variance = better"
          color="cyan"
          weight="25%"
        />
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-lg flex items-center gap-3">
          <div className="h-9 w-9 bg-blue-950/30 border border-blue-900/20 rounded-lg flex items-center justify-center text-blue-400">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-semibold uppercase">Period</p>
            <p className="text-sm font-bold text-gray-200 font-mono">{currentScore.period}</p>
          </div>
        </div>
        <div className="glass-card p-4 rounded-lg flex items-center gap-3">
          <div className="h-9 w-9 bg-emerald-950/30 border border-emerald-900/20 rounded-lg flex items-center justify-center text-emerald-400">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-semibold uppercase">Trades (30d)</p>
            <p className="text-sm font-bold text-gray-200 font-mono">{totalTrades30d}</p>
          </div>
        </div>
        <div className="glass-card p-4 rounded-lg flex items-center gap-3">
          <div className="h-9 w-9 bg-red-950/30 border border-red-900/20 rounded-lg flex items-center justify-center text-red-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-semibold uppercase">Violations (30d)</p>
            <p className="text-sm font-bold text-gray-200 font-mono">{violationCount}</p>
          </div>
        </div>
        <div className="glass-card p-4 rounded-lg flex items-center gap-3">
          <div className="h-9 w-9 bg-amber-950/30 border border-amber-900/20 rounded-lg flex items-center justify-center text-amber-400">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-semibold uppercase">Clean Streak</p>
            <p className="text-sm font-bold text-gray-200 font-mono">
              {streakCount > 0 ? `${streakCount} week${streakCount > 1 ? "s" : ""}` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Trend Chart + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Chart */}
        <div className="lg:col-span-2 glass-card p-5 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                Score Trend
              </h3>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {currentScore.periodType === "WEEKLY" ? "Last 12 weeks" : "Last 6 months"}
              </p>
            </div>
          </div>

          {trend.length >= 2 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    tickFormatter={(v: string) => {
                      if (v.includes("-W")) return v.split("-W")[1] ? `W${v.split("-W")[1]}` : v;
                      const parts = v.split("-");
                      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                      return months[parseInt(parts[1]) - 1] || v;
                    }}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0d0d1a",
                      border: "1px solid #1f2937",
                      borderRadius: "8px",
                      fontSize: 11,
                    }}
                    labelStyle={{ color: "#9ca3af", fontWeight: 700 }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 10, color: "#6b7280" }}
                  />
                  <Line type="monotone" dataKey="compositeScore" name="Composite" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="disciplineScore" name="Discipline" stroke="#60a5fa" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="complianceScore" name="Compliance" stroke="#a78bfa" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="consistencyScore" name="Consistency" stroke="#22d3ee" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center border border-dashed border-gray-800 rounded-lg">
              <p className="text-xs text-gray-500">Trade for at least 2 weeks to see trend data</p>
            </div>
          )}
        </div>

        {/* Coaching Insights */}
        <div className="glass-card p-5 rounded-lg space-y-4">
          <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            Coaching Insights
          </h3>

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {insights.map((insight, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                  insight.type === "warning"
                    ? "bg-red-950/20 border-red-900/30"
                    : insight.type === "achievement"
                    ? "bg-emerald-950/20 border-emerald-900/30"
                    : "bg-blue-950/20 border-blue-900/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold flex items-center gap-1.5 ${
                    insight.type === "warning"
                      ? "text-red-400"
                      : insight.type === "achievement"
                      ? "text-emerald-400"
                      : "text-blue-400"
                  }`}>
                    {insight.type === "warning" && <AlertTriangle className="h-3 w-3" />}
                    {insight.type === "tip" && <Lightbulb className="h-3 w-3" />}
                    {insight.type === "achievement" && <Award className="h-3 w-3" />}
                    {insight.title}
                  </span>
                  {insight.metric && (
                    <span className="text-[10px] font-mono text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded">
                      {insight.metric}
                    </span>
                  )}
                </div>
                <p className="text-gray-400 leading-relaxed">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sub-component: Score Card ---
function ScoreCard({
  title,
  score,
  icon,
  description,
  color,
  weight,
}: {
  title: string;
  score: number;
  icon: React.ReactNode;
  description: string;
  color: "blue" | "purple" | "cyan";
  weight: string;
}) {
  const colorMap = {
    blue: {
      bg: "bg-blue-950/20 border-blue-900/30",
      bar: "bg-blue-500",
      text: "text-blue-400",
      icon: "bg-blue-950/40 border-blue-800/30 text-blue-400",
    },
    purple: {
      bg: "bg-purple-950/20 border-purple-900/30",
      bar: "bg-purple-500",
      text: "text-purple-400",
      icon: "bg-purple-950/40 border-purple-800/30 text-purple-400",
    },
    cyan: {
      bg: "bg-cyan-950/20 border-cyan-900/30",
      bar: "bg-cyan-500",
      text: "text-cyan-400",
      icon: "bg-cyan-950/40 border-cyan-800/30 text-cyan-400",
    },
  };
  const c = colorMap[color];

  return (
    <div className="glass-card p-5 rounded-lg flex flex-col justify-between space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
          <p className={`text-2xl font-bold font-mono ${c.text}`}>{score}</p>
        </div>
        <div className={`h-9 w-9 border rounded-lg flex items-center justify-center ${c.icon}`}>
          {icon}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full ${c.bar} transition-all duration-700`}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-gray-500">{description}</span>
          <span className="text-gray-600 font-mono">Weight: {weight}</span>
        </div>
      </div>
    </div>
  );
}
