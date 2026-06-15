import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { StrategyService } from "@/services/strategy.service";
import { StrategyForm } from "@/components/strategy/strategy-form";
import { StrategyActions } from "@/components/strategy/strategy-actions";
import { Plus, ArrowLeft, Target, Shield, Flame, Scale, Clock, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RuleCategory } from "@prisma/client";
import { serializeDecimal } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Strategy Builder | Trading OS",
};

interface SearchParams {
  action?: string;
  id?: string;
}

export default async function StrategyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const action = params.action;
  const id = params.id;

  // 1. Render CREATE Form
  if (action === "new") {
    return (
      <div className="space-y-6 animate-fade-in max-w-5xl">
        <div className="flex items-center gap-4">
          <Link
            href="/strategy"
            className="p-2 border border-gray-850 hover:border-gray-750 bg-gray-950 text-gray-400 hover:text-white rounded-md transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Create New Strategy</h1>
            <p className="text-sm text-gray-400 mt-1">
              Define target markets, entry confluences, position sizing, and checklist rules
            </p>
          </div>
        </div>
        <div className="bg-gray-950 border border-gray-850 p-6 rounded-lg">
          <StrategyForm />
        </div>
      </div>
    );
  }

  // 2. Render EDIT Form
  if (action === "edit" && id) {
    let strategy;
    try {
      strategy = await StrategyService.getStrategyById(session.user.id, id);
    } catch {
      redirect("/strategy");
    }

    const serializedStrategy = serializeDecimal(strategy);

    return (
      <div className="space-y-6 animate-fade-in max-w-5xl">
        <div className="flex items-center gap-4">
          <Link
            href="/strategy"
            className="p-2 border border-gray-850 hover:border-gray-750 bg-gray-950 text-gray-400 hover:text-white rounded-md transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Edit Strategy Rulebook
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Update checklist confluences and increment version number for rule snapshotting
            </p>
          </div>
        </div>
        <div className="bg-gray-950 border border-gray-850 p-6 rounded-lg">
          <StrategyForm initialData={serializedStrategy} />
        </div>
      </div>
    );
  }

  // 3. Render LISTING dashboard
  const strategies = await StrategyService.getStrategies(session.user.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Strategy Builder</h1>
          <p className="text-sm text-gray-400 mt-1">
            Define your trading rules, structure checklist confluences, and version your playbooks
          </p>
        </div>
        <Link
          href="/strategy?action=new"
          className="px-4 h-10 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-md transition flex items-center justify-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Create Strategy
        </Link>
      </div>

      {strategies.length === 0 ? (
        <div className="bg-gray-950 border border-gray-850 rounded-lg p-16 text-center max-w-3xl mx-auto space-y-4">
          <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-full inline-block">
            <Target className="h-8 w-8 text-gray-650" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-200">No strategy defined</h3>
            <p className="text-xs text-gray-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
              Define your trading strategy with entry conditions, risk limits, and exit management rules. The system will auto-generate checklist rules for trade logging.
            </p>
          </div>
          <Link
            href="/strategy?action=new"
            className="px-4 h-9 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded transition inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Build First Strategy
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {strategies.map((strat) => {
            const activeVer = strat.versions.find((v) => v.isActive);
            if (!activeVer) return null;

            const preferredSessions = (activeVer.preferredSessions as string[]) || [];
            const higherTimeframes = (activeVer.higherTimeframes as string[]) || [];
            const entryTimeframes = (activeVer.entryTimeframes as string[]) || [];
            const entryConditions = (activeVer.entryConditions as string[]) || [];
            const riskRules = (activeVer.riskRules as { name: string; value: string }[]) || [];
            const managementRules =
              (activeVer.managementRules as { name: string; value: string }[]) || [];
            const rulesList = activeVer.rules || [];

            return (
              <div
                key={strat.id}
                className="bg-gray-950 border border-gray-850 rounded-lg overflow-hidden"
              >
                {/* Strat top banner */}
                <div className="border-b border-gray-850 bg-gray-900/10 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h3 className="text-base font-bold text-white">{strat.name}</h3>
                      <span className="px-2 py-0.5 bg-gray-900 border border-gray-800 text-gray-400 text-[10px] font-bold rounded">
                        {strat.market}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-950/20 border border-blue-900/50 text-blue-400 text-[10px] font-bold rounded">
                        Version {activeVer.version}
                      </span>
                    </div>
                    {activeVer.changelog && (
                      <p className="text-xs text-gray-500 mt-1 italic">
                        Latest: {activeVer.changelog}
                      </p>
                    )}
                  </div>
                  <StrategyActions strategyId={strat.id} />
                </div>

                {/* Details grid */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Setup parameters */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-gray-650" />
                      Session & Timeframes
                    </h4>
                    <div className="space-y-3 bg-gray-900/10 border border-gray-850/50 p-4 rounded-md text-xs space-y-3">
                      <div className="space-y-1">
                        <span className="text-gray-500">Sessions</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {preferredSessions.map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-gray-900 border border-gray-800 text-gray-300 rounded text-[10px] font-semibold">
                              {s.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-gray-500">Higher Timeframes</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {higherTimeframes.map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-gray-900 border border-gray-800 text-gray-300 rounded text-[10px] font-mono font-bold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-gray-500">Execution Timeframes</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {entryTimeframes.map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-gray-900 border border-gray-800 text-gray-300 rounded text-[10px] font-mono font-bold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Risk & Management rules */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5 text-gray-650" />
                      Risk & Playbook Rules
                    </h4>
                    <div className="space-y-3 bg-gray-900/10 border border-gray-850/50 p-4 rounded-md text-xs space-y-3">
                      {/* Risk */}
                      {riskRules.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-gray-500 font-semibold uppercase text-[9px] tracking-wide">Risk Rules</span>
                          {riskRules.map((r, idx) => (
                            <div key={idx} className="flex justify-between border-b border-gray-900 pb-1">
                              <span className="text-gray-400">{r.name}</span>
                              <span className="text-blue-400 font-mono font-medium">{r.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Mgmt */}
                      {managementRules.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-gray-500 font-semibold uppercase text-[9px] tracking-wide">Management Rules</span>
                          {managementRules.map((r, idx) => (
                            <div key={idx} className="flex justify-between border-b border-gray-900 pb-1">
                              <span className="text-gray-400">{r.name}</span>
                              <span className="text-blue-400 font-mono font-medium">{r.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Checklist Rules list */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-gray-650" />
                      Adherence Checklist ({rulesList.length})
                    </h4>
                    <div className="max-h-[175px] overflow-y-auto space-y-2 bg-gray-900/10 border border-gray-850/50 p-4 rounded-md text-xs">
                      {rulesList.length === 0 ? (
                        <span className="text-gray-500 italic">No checklist rules added.</span>
                      ) : (
                        rulesList.map((rule) => (
                          <div key={rule.id} className="flex items-start gap-1.5 bg-gray-950 border border-gray-900 p-2 rounded">
                            <span className={`text-[9px] font-bold uppercase px-1 rounded shrink-0 mt-0.5 ${
                              rule.isRequired 
                                ? "text-red-400 bg-red-950/20 border border-red-900/50" 
                                : "text-gray-400 bg-gray-900"
                            }`}>
                              {rule.isRequired ? "Req" : "Opt"}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-300 truncate">{rule.name}</p>
                              {rule.description && (
                                <p className="text-[10px] text-gray-500 truncate">{rule.description}</p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
