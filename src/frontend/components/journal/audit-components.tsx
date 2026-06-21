"use client";

import React from "react";
import { ShieldAlert, Lightbulb, AlertTriangle, ChevronRight, TrendingUp } from "lucide-react";

// ==========================================
// ScoreCard Component
// ==========================================
interface ScoreCardProps {
  title: string;
  score: number;
  colorClass: "green" | "blue" | "purple";
}

export function ScoreCard({ title, score, colorClass }: ScoreCardProps) {
  const getBarColor = () => {
    switch (colorClass) {
      case "green":
        return "bg-emerald-500 shadow-emerald-500/20";
      case "blue":
        return "bg-blue-500 shadow-blue-500/20";
      case "purple":
        return "bg-purple-500 shadow-purple-500/20";
    }
  };

  const getBgColor = () => {
    switch (colorClass) {
      case "green":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
      case "blue":
        return "bg-blue-500/10 border-blue-500/20 text-blue-400";
      case "purple":
        return "bg-purple-500/10 border-purple-500/20 text-purple-400";
    }
  };

  return (
    <div className={`p-5 rounded-xl border ${getBgColor()} backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5`}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</span>
        <span className="text-2xl font-black font-mono">{score}%</span>
      </div>
      <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out shadow-lg ${getBarColor()}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ==========================================
// ViolationCard Component
// ==========================================
interface ViolationCardProps {
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category: string;
  description: string;
  plImpact: number | null;
}

export function ViolationCard({ severity, category, description, plImpact }: ViolationCardProps) {
  const getSeverityStyles = () => {
    switch (severity) {
      case "CRITICAL":
        return "bg-rose-950/40 border-rose-800/40 text-rose-400 text-rose-300";
      case "HIGH":
        return "bg-red-950/30 border-red-900/40 text-red-400 text-red-300";
      case "MEDIUM":
        return "bg-amber-950/20 border-amber-900/30 text-amber-400 text-amber-300";
      case "LOW":
      default:
        return "bg-blue-950/15 border-blue-900/20 text-blue-400 text-blue-300";
    }
  };

  const getBadgeStyles = () => {
    switch (severity) {
      case "CRITICAL":
        return "bg-rose-950 text-rose-400 border-rose-800/50";
      case "HIGH":
        return "bg-red-950 text-red-400 border-red-900/50";
      case "MEDIUM":
        return "bg-amber-950 text-amber-400 border-amber-900/50";
      case "LOW":
      default:
        return "bg-blue-950 text-blue-400 border-blue-900/50";
    }
  };

  return (
    <div className={`p-4 border rounded-xl backdrop-blur-md transition duration-300 hover:border-gray-700 flex flex-col justify-between gap-3 ${getSeverityStyles()}`}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span className="font-bold text-xs uppercase tracking-wide">{category || "Rule Violation"}</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getBadgeStyles()}`}>
          {severity}
        </span>
      </div>

      <p className="text-xs font-medium leading-relaxed">{description}</p>

      {plImpact !== null && (
        <div className="border-t border-gray-800/40 pt-2 flex justify-between items-center mt-1">
          <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Estimated Cost</span>
          <span className="font-mono text-sm font-black text-red-400">
            -${Math.abs(plImpact).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}

// ==========================================
// CoachingCard Component
// ==========================================
interface CoachingCardProps {
  recommendation: string;
  benefit: string;
  index: number;
}

export function CoachingCard({ recommendation, benefit, index }: CoachingCardProps) {
  return (
    <div className="bg-gray-950 border border-gray-850 p-5 rounded-xl backdrop-blur-md flex gap-4 transition duration-300 hover:border-gray-800">
      <div className="p-3 bg-blue-950/40 border border-blue-900/40 text-blue-400 rounded-xl h-fit shrink-0">
        <Lightbulb className="h-5 w-5" />
      </div>
      <div className="space-y-2 min-w-0">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block font-mono">
          Recommendation {index}
        </span>
        <h4 className="text-sm font-semibold text-gray-200 leading-snug">{recommendation}</h4>
        {benefit && (
          <div className="pt-1.5 flex items-start gap-1.5 text-xs text-gray-400 leading-normal">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-gray-300">Expected Benefit: </span>
              {benefit}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// MistakeCard Component
// ==========================================
interface MistakeCardProps {
  description: string;
  index: number;
}

export function MistakeCard({ description, index }: MistakeCardProps) {
  return (
    <div className="bg-gray-950 border border-gray-850 p-5 rounded-xl backdrop-blur-md flex gap-4 transition duration-300 hover:border-gray-800">
      <div className="p-3 bg-amber-950/20 border border-amber-900/30 text-amber-500 rounded-xl h-fit shrink-0">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block font-mono">
          Mistake {index}
        </span>
        <p className="text-xs font-semibold text-gray-300 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
