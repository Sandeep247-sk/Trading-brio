"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChecklistBuilder, ChecklistRuleInput } from "./checklist-builder";
import { Market, TradingSession } from "@prisma/client";
import { toast } from "sonner";
import { Plus, X, Loader2 } from "lucide-react";

interface StrategyFormProps {
  initialData?: any; // For editing
}

export const StrategyForm: React.FC<StrategyFormProps> = ({ initialData }) => {
  const router = useRouter();
  const isEdit = !!initialData;
  const activeVersion = initialData?.versions?.find((v: any) => v.isActive);

  // General Fields
  const [name, setName] = useState(initialData?.name || "");
  const [market, setMarket] = useState<Market>(initialData?.market || Market.XAUUSD);
  
  // Preferred Sessions
  const [preferredSessions, setPreferredSessions] = useState<TradingSession[]>(
    activeVersion?.preferredSessions || [TradingSession.LONDON, TradingSession.NEW_YORK]
  );

  // Tags states (Timeframes, Conditions)
  const [higherTimeframes, setHigherTimeframes] = useState<string[]>(
    activeVersion?.higherTimeframes || ["4H", "D"]
  );
  const [entryTimeframes, setEntryTimeframes] = useState<string[]>(
    activeVersion?.entryTimeframes || ["5m", "15m"]
  );
  const [entryConditions, setEntryConditions] = useState<string[]>(
    activeVersion?.entryConditions || ["Liquidity Sweep", "MSS", "FVG"]
  );

  // Key-value lists states
  const [riskRules, setRiskRules] = useState<{ name: string; value: string; isRequired: boolean }[]>(
    activeVersion?.riskRules || [
      { name: "Max Daily Risk", value: "2%", isRequired: true },
      { name: "Position Size Risk", value: "1% per trade", isRequired: true },
    ]
  );
  const [managementRules, setManagementRules] = useState<{ name: string; value: string; isRequired: boolean }[]>(
    activeVersion?.managementRules || [
      { name: "Trailing Stop", value: "Move to breakeven at 1:1 RR", isRequired: false },
    ]
  );

  // Checklist rules
  const [rules, setRules] = useState<ChecklistRuleInput[]>(
    activeVersion?.rules || []
  );

  // Editing notes
  const [changelogNotes, setChangelogNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Helper inputs for tags
  const [htfInput, setHtfInput] = useState("");
  const [etInput, setEtInput] = useState("");
  const [ecInput, setEcInput] = useState("");

  // Helper inputs for key-values
  const [newRiskName, setNewRiskName] = useState("");
  const [newRiskVal, setNewRiskVal] = useState("");
  const [newMgmtName, setNewMgmtName] = useState("");
  const [newMgmtVal, setNewMgmtVal] = useState("");

  // Toggle Session choice
  const toggleSession = (session: TradingSession) => {
    if (preferredSessions.includes(session)) {
      setPreferredSessions(preferredSessions.filter((s) => s !== session));
    } else {
      setPreferredSessions([...preferredSessions, session]);
    }
  };

  // Tag Add Helpers
  const addTag = (
    input: string,
    setInput: React.Dispatch<React.SetStateAction<string>>,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const trimmed = input.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setInput("");
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!name.trim()) {
      toast.error("Please enter a strategy name.");
      return;
    }
    if (preferredSessions.length === 0) {
      toast.error("Please select at least one preferred trading session.");
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading(isEdit ? "Creating new strategy version..." : "Creating strategy...");

    try {
      const payload = {
        name,
        market,
        preferredSessions,
        higherTimeframes,
        entryTimeframes,
        entryConditions,
        riskRules,
        managementRules,
        rules: rules.map((r) => ({
          category: r.category,
          name: r.name,
          description: r.description || undefined,
          isRequired: r.isRequired,
          order: r.order,
        })),
        changelogNotes: isEdit ? changelogNotes || "Updated rules and checklists" : undefined,
      };

      const url = isEdit ? `/api/strategies/${initialData.id}` : "/api/strategies";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save strategy");
      }

      toast.dismiss(loadingToast);
      toast.success(isEdit ? "Strategy updated successfully" : "Strategy created successfully");
      router.push("/strategy");
      router.refresh();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "Failed to save strategy");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Metadata */}
        <div className="md:col-span-2 space-y-6 bg-muted/40 p-6 border border-border rounded-lg">
          <h3 className="text-base font-semibold text-foreground">Strategy Parameters</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Strategy Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Strategy Name
              </label>
              <input
                type="text"
                placeholder="e.g. ICT Silver Bullet"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 bg-card border border-border rounded-md text-sm text-foreground/80 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Target Asset Market */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Asset Class / Market
              </label>
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value as Market)}
                className="w-full h-10 px-3 bg-card border border-border rounded-md text-sm text-foreground/80 focus:outline-none focus:border-blue-500"
              >
                <option value={Market.XAUUSD}>Gold (XAUUSD)</option>
                <option value={Market.FOREX}>Forex</option>
                <option value={Market.INDICES}>Indices</option>
                <option value={Market.CRYPTO}>Crypto</option>
              </select>
            </div>
          </div>

          {/* Session Selection */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Preferred Trading Sessions
            </label>
            <div className="flex flex-wrap gap-3">
              {[TradingSession.LONDON, TradingSession.NEW_YORK, TradingSession.ASIAN].map((sess) => {
                const isActive = preferredSessions.includes(sess);
                return (
                  <button
                    key={sess}
                    type="button"
                    onClick={() => toggleSession(sess)}
                    className={`px-4 py-2 text-xs font-semibold rounded-md border transition ${
                      isActive
                        ? "bg-blue-600/10 border-blue-500 text-blue-400"
                        : "bg-card border-border text-muted-foreground hover:border-border"
                    }`}
                  >
                    {sess.replace(/_/g, " ")}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Info panel */}
        <div className="bg-muted/40 p-6 border border-border rounded-lg flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Rulebook Version Control</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When updating a strategy, the active version is snapshot-archived. We maintain full rule audit trails so old trades continue to check rules as they existed at execution time.
            </p>
          </div>
          {isEdit && (
            <div className="space-y-2 pt-4 border-t border-border">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Changelog / Version Notes
              </label>
              <textarea
                rows={2}
                placeholder="Briefly state what rules changed (e.g., Added 5m FVG confluence)"
                value={changelogNotes}
                onChange={(e) => setChangelogNotes(e.target.value)}
                className="w-full p-2.5 bg-card border border-border rounded-md text-xs text-foreground/80 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Timeframes & Entry Conditions (Tags List) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/40 p-6 border border-border rounded-lg">
        {/* HTF */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Higher Timeframes (HTF)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 4H, Daily"
              value={htfInput}
              onChange={(e) => setHtfInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(htfInput, setHtfInput, higherTimeframes, setHigherTimeframes))}
              className="flex-1 h-9 px-2.5 bg-card border border-border rounded text-xs text-foreground/80 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => addTag(htfInput, setHtfInput, higherTimeframes, setHigherTimeframes)}
              className="px-2.5 h-9 bg-gray-850 hover:bg-muted border border-border rounded text-xs font-semibold text-foreground/80"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[40px]">
            {higherTimeframes.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-card border border-border text-foreground/80 text-xs rounded-full font-mono font-bold">
                {tag}
                <button type="button" onClick={() => setHigherTimeframes(higherTimeframes.filter((t) => t !== tag))} className="text-muted-foreground hover:text-red-400">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Entry Timeframes */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Execution Timeframes
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 1m, 5m, 15m"
              value={etInput}
              onChange={(e) => setEtInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(etInput, setEtInput, entryTimeframes, setEntryTimeframes))}
              className="flex-1 h-9 px-2.5 bg-card border border-border rounded text-xs text-foreground/80 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => addTag(etInput, setEtInput, entryTimeframes, setEntryTimeframes)}
              className="px-2.5 h-9 bg-gray-850 hover:bg-muted border border-border rounded text-xs font-semibold text-foreground/80"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[40px]">
            {entryTimeframes.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-card border border-border text-foreground/80 text-xs rounded-full font-mono font-bold">
                {tag}
                <button type="button" onClick={() => setEntryTimeframes(entryTimeframes.filter((t) => t !== tag))} className="text-muted-foreground hover:text-red-400">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Entry Conditions */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Entry Confluences
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. MSS Shift, FVG Gap"
              value={ecInput}
              onChange={(e) => setEcInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(ecInput, setEcInput, entryConditions, setEntryConditions))}
              className="flex-1 h-9 px-2.5 bg-card border border-border rounded text-xs text-foreground/80 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => addTag(ecInput, setEcInput, entryConditions, setEntryConditions)}
              className="px-2.5 h-9 bg-gray-850 hover:bg-muted border border-border rounded text-xs font-semibold text-foreground/80"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[40px]">
            {entryConditions.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-card border border-border text-foreground/80 text-xs rounded-full">
                {tag}
                <button type="button" onClick={() => setEntryConditions(entryConditions.filter((t) => t !== tag))} className="text-muted-foreground hover:text-red-400">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Key-Value Rules Editors (Risk & Management) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk Rules */}
        <div className="bg-muted/40 p-6 border border-border rounded-lg space-y-4">
          <h3 className="text-sm font-semibold text-gray-250 uppercase tracking-wide">Risk Controls</h3>
          
          <div className="space-y-2">
            {riskRules.map((rule, idx) => (
              <div key={idx} className="flex justify-between items-center bg-card border border-border p-2.5 rounded text-xs">
                <span className="font-semibold text-muted-foreground">{rule.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-blue-400 font-medium font-mono">{rule.value}</span>
                  <button
                    type="button"
                    onClick={() => setRiskRules(riskRules.filter((_, i) => i !== idx))}
                    className="text-gray-650 hover:text-red-400 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/80">
            <input
              type="text"
              placeholder="Name (e.g. Max Contracts)"
              value={newRiskName}
              onChange={(e) => setNewRiskName(e.target.value)}
              className="h-9 px-2.5 bg-card border border-border rounded text-xs text-foreground/80 focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Value (e.g. 5 Lots)"
                value={newRiskVal}
                onChange={(e) => setNewRiskVal(e.target.value)}
                className="flex-1 h-9 px-2.5 bg-card border border-border rounded text-xs text-foreground/80 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (newRiskName.trim() && newRiskVal.trim()) {
                    setRiskRules([...riskRules, { name: newRiskName, value: newRiskVal, isRequired: true }]);
                    setNewRiskName("");
                    setNewRiskVal("");
                  }
                }}
                className="px-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-xs font-semibold"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Management Rules */}
        <div className="bg-muted/40 p-6 border border-border rounded-lg space-y-4">
          <h3 className="text-sm font-semibold text-gray-250 uppercase tracking-wide">Management Controls</h3>
          
          <div className="space-y-2">
            {managementRules.map((rule, idx) => (
              <div key={idx} className="flex justify-between items-center bg-card border border-border p-2.5 rounded text-xs">
                <span className="font-semibold text-muted-foreground">{rule.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-blue-400 font-medium font-mono">{rule.value}</span>
                  <button
                    type="button"
                    onClick={() => setManagementRules(managementRules.filter((_, i) => i !== idx))}
                    className="text-gray-650 hover:text-red-400 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/80">
            <input
              type="text"
              placeholder="Name (e.g. Profit targets)"
              value={newMgmtName}
              onChange={(e) => setNewMgmtName(e.target.value)}
              className="h-9 px-2.5 bg-card border border-border rounded text-xs text-foreground/80 focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Value (e.g. Partial 50% at 2R)"
                value={newMgmtVal}
                onChange={(e) => setNewMgmtVal(e.target.value)}
                className="flex-1 h-9 px-2.5 bg-card border border-border rounded text-xs text-foreground/80 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (newMgmtName.trim() && newMgmtVal.trim()) {
                    setManagementRules([...managementRules, { name: newMgmtName, value: newMgmtVal, isRequired: false }]);
                    setNewMgmtName("");
                    setNewMgmtVal("");
                  }
                }}
                className="px-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-xs font-semibold"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist Rules Editor */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-foreground/80 block">
          Strategy Checklist Rules Builder
        </label>
        <ChecklistBuilder initialRules={rules} onRulesChange={setRules} />
      </div>

      {/* Submit Controls */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.push("/strategy")}
          className="px-5 h-11 border border-border rounded-md text-sm text-muted-foreground hover:text-white hover:bg-muted transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-md transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{isEdit ? "Create Version" : "Save Strategy"}</span>
          )}
        </button>
      </div>
    </form>
  );
};
