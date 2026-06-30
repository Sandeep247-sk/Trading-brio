"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  Loader2, 
  RefreshCw,
  Copy,
  Printer,
  Check,
  FileText,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { RuleCategory } from "@prisma/client";
import { ScoreCard, ViolationCard, CoachingCard, MistakeCard } from "./audit-components";

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

interface DbViolation {
  id: string;
  description: string;
  plImpact: any;
  category: {
    name: string;
    severity: any;
  };
}

interface TradeAiAuditProps {
  tradeId: string;
  rules: StrategyRule[];
  strategyName: string;
  strategyVersion: number | string;
  initialAnalysis: TradeAnalysis | null;
  violations?: DbViolation[];
}

export const TradeAiAudit: React.FC<TradeAiAuditProps> = ({
  tradeId,
  rules,
  strategyName,
  strategyVersion,
  initialAnalysis,
  violations = []
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(initialAnalysis);
  const [copied, setCopied] = useState(false);

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

  const copySummary = () => {
    if (!analysis || !analysis.checklist) return;
    
    // Create copyable summary content
    const summaryText = `AI Setup Audit Summary (Grade: ${formatGrade(analysis.grade)})\n` +
      `Strategy Match: ${analysis.matchScore}%\n` +
      `Execution: ${analysis.executionScore}%\n` +
      `Discipline: ${analysis.disciplineScore}%\n\n` +
      `AI Summary:\n${getSummaryText()}\n`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    toast.success("Copied AI Audit summary to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const exportPDF = () => {
    window.print();
  };

  const getSummaryText = () => {
    if (!analysis) return "";
    // If rawResponse is present, try to extract summary, otherwise build a description
    return (analysis as any).rawResponse?.summary || 
      `The trade was audited against the strategy "${strategyName}". The execution adheres to the preset parameters with a discipline rating of ${analysis.disciplineScore}%.`;
  };

  const formatGrade = (grade: string) => {
    return grade ? grade.replace("_PLUS", "+") : "--";
  };

  const getGradeColors = (grade: string) => {
    switch (grade) {
      case "A_PLUS":
      case "A":
        return {
          bg: "bg-card/80 border-border text-white",
          badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
          glow: ""
        };
      case "B":
        return {
          bg: "bg-card/80 border-border text-white",
          badge: "bg-blue-500/20 text-blue-300 border-blue-500/40",
          glow: ""
        };
      case "C":
        return {
          bg: "bg-card/80 border-border text-white",
          badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
          glow: ""
        };
      case "D":
      default:
        return {
          bg: "bg-card/80 border-border text-white",
          badge: "bg-red-500/20 text-red-300 border-red-500/40",
          glow: ""
        };
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

  const gradeColors = analysis ? getGradeColors(analysis.grade) : null;

  return (
    <div className="space-y-8 w-full">
      {/* Header and Subtitle */}
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-bold tracking-tight text-foreground">AI Setup Audit Results</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-2 max-w-4xl leading-relaxed">
          Our integrated AI will audit your trade, analyze execution quality, identify mistakes, detect rule violations, and provide actionable coaching insights to help improve your trading performance.
        </p>
      </div>

      {/* Audit content states */}
      {loading ? (
        // Skeleton loader while audit runs
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-muted/30 border border-border rounded-xl p-5 space-y-3">
                <div className="h-4 bg-gray-850 rounded w-2/3" />
                <div className="h-6 bg-gray-850 rounded w-1/3" />
                <div className="h-2 bg-gray-850 rounded-full w-full" />
              </div>
            ))}
          </div>
          <div className="h-32 bg-muted/30 border border-border rounded-xl p-5 space-y-3">
            <div className="h-4 bg-gray-850 rounded w-1/4" />
            <div className="h-3 bg-gray-850 rounded w-full" />
            <div className="h-3 bg-gray-850 rounded w-5/6" />
          </div>
        </div>
      ) : !analysis ? (
        // Initial state before audit
        <div className="bg-gradient-to-br from-blue-950/15 to-gray-950/20 border border-blue-900/20 p-8 rounded-xl flex flex-col items-center justify-center text-center space-y-5 transition duration-300 hover:border-blue-900/30">
          <div className="p-4 bg-blue-950/40 border border-blue-900/40 rounded-2xl text-blue-400 shadow-xl shadow-blue-950/20">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="max-w-md space-y-2">
            <h3 className="text-base font-bold text-foreground">Verify Compliance with our Integrated AI</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Analysis your trade, see full AI Audit of your trade and get suggestions to improve your trading performance.
            </p>
          </div>
          <button
            type="button"
            onClick={runAudit}
            className="px-6 h-11 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            <span>Run AI Setup Audit</span>
          </button>
        </div>
      ) : (
        // Completed Audit Dashboard
        <div className="space-y-8 print:space-y-4">
          
          {/* KPI Dashboard Top Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Grade KPI Card */}
            <div className={`p-5 rounded-xl border backdrop-blur-sm card-hover flex flex-col justify-between ${gradeColors?.bg || "border-border bg-card/80 text-white"}`}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Performance Grade</span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase border ${gradeColors?.badge}`}>
                  Verified
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-black tracking-tight">{formatGrade(analysis.grade)}</span>
                <span className="text-[10px] text-muted-foreground font-medium">Execution Quality</span>
              </div>
            </div>

            {/* Score Cards */}
            <ScoreCard title="Strategy Match" score={analysis.matchScore} colorClass="green" />
            <ScoreCard title="Execution Precision" score={analysis.executionScore} colorClass="blue" />
            <ScoreCard title="Discipline Score" score={analysis.disciplineScore} colorClass="purple" />
          </div>

          {/* AI Trade Summary Panel */}
          <div className="bg-card border border-border p-6 rounded-xl relative overflow-hidden transition hover:border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-blue-400" />
                  AI Trade Summary
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Generated by Integrated AI
                </p>
              </div>
              
              {/* Action Toolbar */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={copySummary}
                  className="h-8 px-3 bg-muted border border-border hover:border-border text-foreground/80 rounded-md text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copied" : "Copy Summary"}</span>
                </button>
                <button
                  type="button"
                  onClick={exportPDF}
                  className="h-8 px-3 bg-muted border border-border hover:border-border text-foreground/80 rounded-md text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 print:hidden"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print PDF</span>
                </button>
                <button
                  type="button"
                  onClick={runAudit}
                  className="h-8 px-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 rounded-md text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 print:hidden"
                >
                  <RefreshCw className="h-3.5 w-3.5 animate-hover-spin" />
                  <span>Re-run</span>
                </button>
              </div>
            </div>

            <div className="text-sm text-foreground/80 leading-relaxed font-medium whitespace-pre-wrap">
              {getSummaryText()}
            </div>
            
            <div className="mt-4 flex items-center gap-1 text-[9px] text-muted-foreground font-mono">
              <Clock className="h-3.5 w-3.5" />
              <span>Audited: {new Date(analysis.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Detected Violations Section */}
          {Array.isArray(analysis.detectedViolations) && analysis.detectedViolations.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                <AlertOctagon className="h-4 w-4" />
                Detected Violations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.detectedViolations.map((v: any, index: number) => (
                  <ViolationCard 
                    key={index}
                    severity={v.severity || "MEDIUM"}
                    category={v.category || "Rule Violation"}
                    description={v.description}
                    plImpact={v.plImpact !== undefined ? v.plImpact : null}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Mistakes Section */}
          {Array.isArray(analysis.mistakes) && analysis.mistakes.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                <AlertOctagon className="h-4 w-4" />
                Mistakes Spotted
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.mistakes.map((m: string, idx: number) => (
                  <MistakeCard key={idx} description={m} index={idx + 1} />
                ))}
              </div>
            </div>
          )}

          {/* AI Coaching Suggestions Section */}
          {Array.isArray(analysis.suggestions) && analysis.suggestions.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                AI Coaching Suggestions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.suggestions.map((s: any, idx: number) => {
                  const recommendation = typeof s === "string" ? s : s.recommendation || "";
                  const benefit = typeof s === "string" ? "Lower risk profile and higher consistency score." : s.benefit || "";
                  return (
                    <CoachingCard 
                      key={idx} 
                      recommendation={recommendation} 
                      benefit={benefit} 
                      index={idx + 1} 
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Strategy Checklist Section */}
          <div className="bg-card border border-border p-6 rounded-xl space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-250">Strategy Checklist</h3>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                Strategy: {strategyName} (v{strategyVersion})
              </p>
            </div>

            {rules.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">
                No rules defined for this strategy version.
              </div>
            ) : (
              <div className="space-y-6">
                {(Object.keys(RuleCategory) as RuleCategory[]).map((cat) => {
                  const catRules = rules.filter((r) => r.category === cat);
                  if (catRules.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-3">
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                        {cat.replace(/_/g, " ")}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {catRules.map((rule) => {
                          const status = getRuleStatus(rule.name);
                          
                          // Determine border/text based on pass (green), fail (red), gray (neutral)
                          const getChecklistStyles = () => {
                            if (status === "pass") {
                              return "bg-emerald-950/5 border-emerald-900/30 hover:border-emerald-800 text-emerald-450";
                            }
                            if (status === "fail") {
                              return "bg-red-950/5 border-red-900/30 hover:border-red-800 text-red-450";
                            }
                            return "bg-muted/20 border-border hover:border-border text-foreground/80";
                          };

                          return (
                            <div
                              key={rule.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border text-xs transition duration-200 ${getChecklistStyles()}`}
                            >
                              {status === "pass" ? (
                                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                              ) : status === "fail" ? (
                                <XCircle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                              ) : (
                                <div className="h-4.5 w-4.5 rounded-full border border-gray-750 bg-muted/50 shrink-0 mt-0.5" />
                              )}
                              
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground">{rule.name}</p>
                                {rule.description && (
                                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                                    {rule.description}
                                  </p>
                                )}
                              </div>
                              {rule.isRequired && (
                                <span className="text-[9px] font-bold text-red-400 bg-red-950/20 border border-red-900/50 px-1 rounded shrink-0">
                                  REQUIRED
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

          {/* Violations History Section (from DB) */}
          {violations.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                <AlertOctagon className="h-4 w-4" />
                Violations History
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {violations.map((v) => (
                  <ViolationCard 
                    key={v.id}
                    severity={v.category?.severity || "MEDIUM"}
                    category={v.category?.name || "Rule Violation"}
                    description={v.description}
                    plImpact={v.plImpact !== null ? Number(v.plImpact) : null}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
