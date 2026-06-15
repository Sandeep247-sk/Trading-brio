"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Lightbulb, 
  ShieldAlert, 
  RefreshCw,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { RuleCategory } from "@prisma/client";

interface StrategyRule {
  id: string;
  category: RuleCategory;
  name: string;
  description: string | null;
  isRequired: boolean;
  order: number;
}

interface TradeAnalysis {
  id: string;
  matchScore: number;
  executionScore: number;
  disciplineScore: number;
  grade: string;
  checklist: any; // Array of {rule: string, detected: boolean}
  mistakes: any; // Array of strings
  suggestions: any; // Array of strings
  detectedViolations: any; // Array of violation objects
  modelUsed: string;
  createdAt: string | Date;
}

interface TradeAiAuditProps {
  tradeId: string;
  rules: StrategyRule[];
  strategyName: string;
  strategyVersion: number | string;
  initialAnalysis: TradeAnalysis | null;
}

export const TradeAiAudit: React.FC<TradeAiAuditProps> = ({
  tradeId,
  rules,
  strategyName,
  strategyVersion,
  initialAnalysis
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(initialAnalysis);

  const runAudit = async () => {
    setLoading(true);
    const toastId = toast.loading("AI compliance officer is auditing trade screenshots and notes...");

    try {
      const res = await fetch(`/api/trades/${tradeId}/audit`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to audit trade");
      }

      const data = await res.json();
      setAnalysis(data.analysis);
      toast.success("AI Setup Audit completed successfully!", { id: toastId });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete AI Audit", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // Parse AI checklist results
  const aiChecklist = Array.isArray(analysis?.checklist) ? analysis.checklist : [];
  
  // Helper to determine the status of a rule
  const getRuleStatus = (ruleName: string) => {
    if (!analysis) return "neutral";
    const found = aiChecklist.find(
      (c: any) => c.rule?.toLowerCase() === ruleName.toLowerCase() || 
                  ruleName.toLowerCase().includes(c.rule?.toLowerCase()) ||
                  c.rule?.toLowerCase().includes(ruleName.toLowerCase())
    );
    if (!found) return "neutral";
    return found.detected ? "pass" : "fail";
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A_PLUS":
      case "A":
        return "from-green-500/20 to-emerald-500/20 border-green-500/40 text-green-400";
      case "B":
        return "from-blue-500/20 to-indigo-500/20 border-blue-500/40 text-blue-400";
      case "C":
        return "from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-400";
      case "D":
      default:
        return "from-red-500/20 to-rose-500/20 border-red-500/40 text-red-400";
    }
  };

  const formatGrade = (grade: string) => {
    return grade.replace("_PLUS", "+");
  };

  return (
    <div className="space-y-6">
      {/* Strategy Checklist with Verification Status */}
      <div className="bg-gray-950 border border-gray-850 p-6 rounded-lg space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Strategy Checklist</h3>
          <p className="text-xs text-gray-500 mt-1 font-mono">
            Strategy: {strategyName} (v{strategyVersion})
          </p>
        </div>

        {rules.length === 0 ? (
          <div className="text-xs text-gray-500 italic">
            No rules defined for this strategy version.
          </div>
        ) : (
          <div className="space-y-4">
            {(Object.keys(RuleCategory) as RuleCategory[]).map((cat) => {
              const catRules = rules.filter((r) => r.category === cat);
              if (catRules.length === 0) return null;

              return (
                <div key={cat} className="space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {cat.replace(/_/g, " ")}
                  </h4>
                  <div className="space-y-1.5">
                    {catRules.map((rule) => {
                      const status = getRuleStatus(rule.name);
                      return (
                        <div
                          key={rule.id}
                          className="flex items-start gap-2.5 bg-gray-900/20 border border-gray-850 p-2.5 rounded text-xs transition hover:border-gray-800"
                        >
                          {status === "pass" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          ) : status === "fail" ? (
                            <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-gray-700 bg-gray-950 shrink-0 mt-0.5" />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-300">{rule.name}</p>
                            {rule.description && (
                              <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                                {rule.description}
                              </p>
                            )}
                          </div>
                          {rule.isRequired && (
                            <span className="text-[9px] font-bold text-red-400 bg-red-950/20 border border-red-900/50 px-1 rounded shrink-0">
                              REQ
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Setup Audit Dashboard */}
      {!analysis ? (
        <div className="bg-gradient-to-br from-blue-950/20 to-gray-950 border border-blue-900/30 p-6 rounded-lg space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-950/40 border border-blue-900/50 rounded-lg text-blue-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-200">AI Setup Audit</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Integrate Gemini 2.5 Flash to automatically verify screenshots, audit confluences, detect risk violations, and grade execution.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={runAudit}
              className="w-full h-10 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 hover:border-blue-500 text-blue-400 text-xs font-semibold rounded-md transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Auditing Setup...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Run AI Setup Audit</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-950 border border-gray-850 rounded-lg overflow-hidden space-y-6 p-6">
          {/* Header with grade */}
          <div className="flex items-center justify-between border-b border-gray-850 pb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-blue-400" />
                AI Setup Audit Result
              </h3>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Audited using Gemini 2.5 Flash
              </p>
            </div>
            <div className={`px-3 py-1 rounded border text-sm font-black bg-gradient-to-r ${getGradeColor(analysis.grade)}`}>
              GRADE {formatGrade(analysis.grade)}
            </div>
          </div>

          {/* Metric scores */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Strategy Setup Match</span>
                <span className="font-semibold text-gray-200 font-mono">{analysis.matchScore}%</span>
              </div>
              <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${analysis.matchScore}%` }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Execution Precision</span>
                <span className="font-semibold text-gray-200 font-mono">{analysis.executionScore}%</span>
              </div>
              <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500" 
                  style={{ width: `${analysis.executionScore}%` }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Discipline Score</span>
                <span className="font-semibold text-gray-200 font-mono">{analysis.disciplineScore}%</span>
              </div>
              <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 transition-all duration-500" 
                  style={{ width: `${analysis.disciplineScore}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Violations if present */}
          {Array.isArray(analysis.detectedViolations) && analysis.detectedViolations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" />
                Detected Violations
              </h4>
              <div className="space-y-1.5">
                {analysis.detectedViolations.map((v: any, index: number) => (
                  <div key={index} className="p-2.5 bg-red-950/20 border border-red-900/40 rounded text-xs text-red-300 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold uppercase text-[9px] tracking-wider px-1 bg-red-950 text-red-400 border border-red-900/50 rounded">
                        {v.category || "Rule Violation"}
                      </span>
                      {v.plImpact !== null && v.plImpact !== undefined && (
                        <span className="font-mono text-red-400 font-bold">
                          -${Math.abs(v.plImpact).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-red-200">{v.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mistakes & Suggestions */}
          <div className="grid grid-cols-1 gap-4 pt-2">
            {/* Mistakes */}
            {Array.isArray(analysis.mistakes) && analysis.mistakes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Mistakes Spotted
                </h4>
                <ul className="space-y-1 text-xs text-gray-300">
                  {analysis.mistakes.map((m: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                      <span className="text-amber-500 select-none mt-0.5">•</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {Array.isArray(analysis.suggestions) && analysis.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                  <Lightbulb className="h-3.5 w-3.5" />
                  AI Coaching Suggestions
                </h4>
                <ul className="space-y-1 text-xs text-gray-300">
                  {analysis.suggestions.map((s: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                      <span className="text-blue-400 select-none mt-0.5">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Re-audit action */}
          <div className="border-t border-gray-850 pt-4 flex items-center justify-between">
            <span className="text-[9px] text-gray-500 font-mono">
              Audited: {new Date(analysis.createdAt).toLocaleDateString()}
            </span>
            <button
              type="button"
              disabled={loading}
              onClick={runAudit}
              className="h-8 px-3 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white rounded text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span>Re-run Audit</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
