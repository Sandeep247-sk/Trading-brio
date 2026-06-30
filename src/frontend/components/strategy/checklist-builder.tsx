"use client";

import React, { useState } from "react";
import { Plus, Trash, ArrowUp, ArrowDown, ShieldAlert } from "lucide-react";
import { RuleCategory } from "@prisma/client";

export interface ChecklistRuleInput {
  id?: string; // local temp id
  category: RuleCategory;
  name: string;
  description?: string;
  isRequired: boolean;
  order: number;
}

interface ChecklistBuilderProps {
  initialRules?: ChecklistRuleInput[];
  onRulesChange: (rules: ChecklistRuleInput[]) => void;
}

const CATEGORIES: { value: RuleCategory; label: string; desc: string }[] = [
  {
    value: RuleCategory.PRE_TRADE,
    label: "Pre-Trade Rules",
    desc: "Checks before session opens (e.g. news check, HTF bias analysis)",
  },
  {
    value: RuleCategory.SESSION,
    label: "Session & Timing",
    desc: "Rules regarding execution windows and volatility hours",
  },
  {
    value: RuleCategory.ENTRY,
    label: "Entry Confirmation",
    desc: "Confluence checks (e.g. MSS shift, FVG sweep, volume validation)",
  },
  {
    value: RuleCategory.RISK,
    label: "Risk Management",
    desc: "Position size limits, max daily risk, drawdown limits",
  },
  {
    value: RuleCategory.EXIT,
    label: "Exit Execution",
    desc: "TP/SL execution, profit taking steps, manual trail thresholds",
  },
  {
    value: RuleCategory.MANAGEMENT,
    label: "Trade Management",
    desc: "Post-entry monitoring (e.g. moving stop loss to breakeven)",
  },
];

export const ChecklistBuilder: React.FC<ChecklistBuilderProps> = ({
  initialRules = [],
  onRulesChange,
}) => {
  const [rules, setRules] = useState<ChecklistRuleInput[]>(
    initialRules.length > 0
      ? initialRules.map((r, index) => ({ ...r, id: r.id || `${Date.now()}-${index}` }))
      : []
  );
  const [activeTab, setActiveTab] = useState<RuleCategory>(RuleCategory.PRE_TRADE);

  // Active Category Rules
  const activeRules = rules
    .filter((r) => r.category === activeTab)
    .sort((a, b) => a.order - b.order);

  const triggerChange = (updatedRules: ChecklistRuleInput[]) => {
    onRulesChange(updatedRules);
  };

  const addRule = () => {
    const order = rules.filter((r) => r.category === activeTab).length;
    const newRule: ChecklistRuleInput = {
      id: crypto.randomUUID(),
      category: activeTab,
      name: "",
      description: "",
      isRequired: true,
      order,
    };
    const updated = [...rules, newRule];
    setRules(updated);
    triggerChange(updated);
  };

  const removeRule = (id: string) => {
    const updated = rules.filter((r) => r.id !== id);
    // Recalculate orders for this category
    const catRules = updated.filter((r) => r.category === activeTab);
    catRules.forEach((r, idx) => {
      r.order = idx;
    });
    setRules(updated);
    triggerChange(updated);
  };

  const updateRuleField = (id: string, field: keyof ChecklistRuleInput, value: any) => {
    const updated = rules.map((r) => {
      if (r.id === id) {
        return { ...r, [field]: value };
      }
      return r;
    });
    setRules(updated);
    triggerChange(updated);
  };

  const moveRule = (index: number, direction: "up" | "down") => {
    const sortedActive = [...activeRules];
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === sortedActive.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = sortedActive[index];
    sortedActive[index] = sortedActive[targetIndex];
    sortedActive[targetIndex] = temp;

    // Reassign order attributes
    sortedActive.forEach((r, idx) => {
      r.order = idx;
    });

    // Merge back with remaining categories
    const otherCatRules = rules.filter((r) => r.category !== activeTab);
    const updated = [...otherCatRules, ...sortedActive];
    setRules(updated);
    triggerChange(updated);
  };

  return (
    <div className="border border-border bg-card rounded-lg overflow-hidden flex flex-col md:flex-row min-h-[480px]">
      {/* Category Sidebar */}
      <div className="md:w-64 border-b md:border-b-0 md:border-r border-border bg-muted/20 p-2 flex flex-row md:flex-col space-x-1 md:space-x-0 md:space-y-1 overflow-x-auto md:overflow-x-visible shrink-0">
        {CATEGORIES.map((cat) => {
          const count = rules.filter((r) => r.category === cat.value).length;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => setActiveTab(cat.value)}
              className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-md transition text-left whitespace-nowrap md:whitespace-normal shrink-0 md:shrink ${
                activeTab === cat.value
                  ? "bg-blue-600/10 border border-blue-500/50 text-blue-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>{cat.label}</span>
              {count > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-muted border border-border text-muted-foreground text-[10px] rounded font-mono shrink-0">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Editor Panel */}
      <div className="flex-1 p-6 space-y-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {CATEGORIES.find((c) => c.value === activeTab)?.label}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {CATEGORIES.find((c) => c.value === activeTab)?.desc}
            </p>
          </div>

          {activeRules.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-dashed border-border p-10 rounded-md bg-muted/10">
              <ShieldAlert className="h-6 w-6 text-muted-foreground/60 mb-2" />
              <p className="text-xs text-muted-foreground">No rules added to this category yet.</p>
              <button
                type="button"
                onClick={addRule}
                className="mt-3 px-3 py-1.5 bg-blue-600/10 border border-blue-500/25 hover:border-blue-500 hover:bg-blue-600/20 text-blue-400 text-xs font-semibold rounded transition flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Add First Rule
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {activeRules.map((rule, idx) => (
                <div
                  key={rule.id}
                  className="flex items-start gap-3 border border-border bg-muted/20 p-3 rounded-md group hover:border-border transition"
                >
                  {/* Order controls */}
                  <div className="flex flex-col space-y-1 text-gray-650 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveRule(idx, "up")}
                      className="p-0.5 hover:text-foreground/80 disabled:opacity-20 transition"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === activeRules.length - 1}
                      onClick={() => moveRule(idx, "down")}
                      className="p-0.5 hover:text-foreground/80 disabled:opacity-20 transition"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Inputs */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5 space-y-1">
                      <input
                        type="text"
                        placeholder="Rule Name (e.g. Liquidity swept)"
                        value={rule.name}
                        onChange={(e) => updateRuleField(rule.id!, "name", e.target.value)}
                        className="w-full text-xs bg-card border border-border rounded px-2.5 py-1.5 text-foreground/80 focus:outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                    <div className="sm:col-span-5 space-y-1">
                      <input
                        type="text"
                        placeholder="Optional details / help note"
                        value={rule.description || ""}
                        onChange={(e) => updateRuleField(rule.id!, "description", e.target.value)}
                        className="w-full text-xs bg-card border border-border rounded px-2.5 py-1.5 text-foreground/80 focus:outline-none focus:border-blue-500 text-muted-foreground"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-between sm:justify-center gap-2">
                      <label className="text-[10px] uppercase font-semibold text-muted-foreground sm:hidden">
                        Required
                      </label>
                      <button
                        type="button"
                        onClick={() => updateRuleField(rule.id!, "isRequired", !rule.isRequired)}
                        className={`px-2 py-1 text-[10px] font-bold rounded border uppercase tracking-wider transition ${
                          rule.isRequired
                            ? "bg-red-500/10 border-red-500/30 text-red-400"
                            : "bg-muted/40 border-gray-750 text-muted-foreground"
                        }`}
                      >
                        {rule.isRequired ? "Required" : "Optional"}
                      </button>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeRule(rule.id!)}
                    className="p-1.5 bg-muted/60 text-muted-foreground hover:text-red-400 hover:bg-red-950/20 border border-border hover:border-red-900/50 rounded transition"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {activeRules.length > 0 && (
          <div className="pt-4 border-t border-border flex justify-end">
            <button
              type="button"
              onClick={addRule}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded transition flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Rule
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
