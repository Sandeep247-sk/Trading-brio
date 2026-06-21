"use client";

import React, { useEffect, useState } from "react";
import { AccountForm } from "@/components/accounts/account-form";
import { toast } from "sonner";
import { 
  Plus, 
  Settings2, 
  Trash2, 
  Star, 
  ChevronRight, 
  LineChart, 
  Activity, 
  TrendingUp, 
  ShieldAlert, 
  AlertTriangle,
  Loader2,
  X,
  Check,
  Trophy,
  Award,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowUpRight
} from "lucide-react";
import confetti from "canvas-confetti";

interface AccountDetails {
  accountInfo: {
    id: string;
    name: string;
    brokerName: string | null;
    accountType: string;
    platform: string;
    accountNumber: string | null;
    currency: string;
    startingBalance: number;
    currentBalance: number;
    netProfit: number;
    growthPercent: number;
    isDefault: boolean;
    challengeName: string | null;
    phasesCount: number | null;
    fundedSince: string | null;
    profitSplit: number | null;
    challengeStatus: string | null;
    isCompleted: boolean;
    completedAt: string | null;
    phases: Array<{
      id: string;
      phaseNumber: number;
      phaseName: string;
      profitTarget: number;
      dailyDrawdownLimit: number;
      maxDrawdownLimit: number;
      completed: boolean;
      completedAt: string | null;
      celebrated: boolean;
    }>;
    currentPhaseNumber: number;
    currentPhaseTargetPercent: number;
    currentProfitPercent: number;
    remainingTargetPercent: number;
    progressPercent: number;
    passProbability: number;
    limits: {
      maxRiskPerTrade: number | null;
      maxDailyDrawdown: number | null;
      maxOverallDrawdown: number | null;
      maxTradesPerDay: number | null;
    };
  };
  performance: {
    totalTrades: number;
    totalProfit: number;
    totalLoss: number;
    netProfit: number;
    winRate: number;
    lossRate: number;
    profitFactor: number | null;
    averageRR: number;
    bestTrade: number;
    worstTrade: number;
  };
  drawdown: {
    dailyDrawdownPercent: number;
    overallDrawdownPercent: number;
    dailyDrawdownAmt: number;
    overallDrawdownAmt: number;
  };
  sessionStats: {
    bestSessionName: string;
    bestSessionPnl: number;
    worstSessionName: string;
    worstSessionPnl: number;
  };
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<AccountDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null); // selected account id
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editAccountData, setEditAccountData] = useState<any | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Celebration state
  const [celebrationPhase, setCelebrationPhase] = useState<any | null>(null);
  const [isFinalCelebration, setIsFinalCelebration] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0) {
          const def = data.find((a: any) => a.isDefault) || data[0];
          setActiveTab(def.id);
        } else {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load accounts list.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (!activeTab) return;

    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/accounts/${activeTab}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedDetails(data);
          
          // Check for uncelebrated phase completions
          const info = data.accountInfo;
          if (info.accountType === "PROP_CHALLENGE") {
            const uncelebratedCompletedPhase = info.phases.find(
              (p: any) => p.completed && !p.celebrated
            );
            if (uncelebratedCompletedPhase) {
              // Trigger Confetti
              triggerConfettiBlast();

              // If it is the final phase, trigger final celebration modal
              const isFinal = uncelebratedCompletedPhase.phaseNumber === info.phasesCount;
              if (isFinal || info.challengeStatus === "CHALLENGE_PASSED") {
                setIsFinalCelebration(true);
              } else {
                setCelebrationPhase(uncelebratedCompletedPhase);
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load account performance details.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [activeTab]);

  const triggerConfettiBlast = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const handleAcknowledgeCelebration = async (phaseId: string) => {
    if (!selectedDetails) return;
    try {
      const res = await fetch(`/api/accounts/${selectedDetails.accountInfo.id}/phases/${phaseId}/celebrate`, {
        method: "PUT",
      });
      if (res.ok) {
        setCelebrationPhase(null);
        setIsFinalCelebration(false);
        // Refresh detail view
        const detailRes = await fetch(`/api/accounts/${selectedDetails.accountInfo.id}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          setSelectedDetails(detailData);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to acknowledge celebration.");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        toast.success("Default account updated.");
        fetchAccounts();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to set default");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Account deleted successfully.");
        setConfirmDeleteId(null);
        if (activeTab === id) {
          setActiveTab(null);
          setSelectedDetails(null);
        }
        fetchAccounts();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account");
      }
    } catch (err: any) {
      toast.error(err.message);
      setConfirmDeleteId(null);
    }
  };

  const formatCurrency = (val: number, curr = "USD") => {
    const symbol = curr === "INR" ? "₹" : curr === "EUR" ? "€" : curr === "GBP" ? "£" : "$";
    return `${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getDrawdownColor = (current: number, max: number | null) => {
    if (!max) return "bg-blue-500";
    const ratio = current / max;
    if (ratio >= 0.8) return "bg-red-500";
    if (ratio >= 0.5) return "bg-orange-500";
    return "bg-blue-500";
  };

  const getDrawdownTextColor = (current: number, max: number | null) => {
    if (!max) return "text-gray-400";
    const ratio = current / max;
    if (ratio >= 0.8) return "text-red-400 font-bold animate-pulse";
    if (ratio >= 0.5) return "text-orange-400 font-semibold";
    return "text-gray-300";
  };

  // Warning Banner rendering helper
  const renderDrawdownWarnings = () => {
    if (!selectedDetails) return null;
    const dailyDD = selectedDetails.drawdown.dailyDrawdownPercent;
    const maxDailyDD = selectedDetails.accountInfo.limits.maxDailyDrawdown;
    const overallDD = selectedDetails.drawdown.overallDrawdownPercent;
    const maxOverallDD = selectedDetails.accountInfo.limits.maxOverallDrawdown;

    const warnings = [];

    if (maxDailyDD && dailyDD / maxDailyDD >= 0.8) {
      const util = Math.round((dailyDD / maxDailyDD) * 100);
      let severity = "WARNING";
      let msg = `Daily Drawdown Warning: You have reached ${util}% of your daily drawdown limit. Trade cautiously.`;
      if (util >= 95) {
        severity = "CRITICAL";
        msg = `CRITICAL Daily Drawdown Alert: You are at ${util}% of your daily drawdown capacity. Risk of account breach is extremely high!`;
      } else if (util < 90) {
        severity = "CAUTION";
        msg = `Daily Drawdown Caution: You have reached ${util}% of your daily drawdown capacity.`;
      }
      warnings.push({ id: "daily", severity, msg });
    }

    if (maxOverallDD && overallDD / maxOverallDD >= 0.8) {
      const util = Math.round((overallDD / maxOverallDD) * 100);
      let severity = "WARNING";
      let msg = `Maximum Drawdown Warning: You have reached ${util}% of your maximum overall drawdown capacity. Reduce risk immediately.`;
      if (util >= 95) {
        severity = "CRITICAL";
        msg = `CRITICAL Maximum Drawdown Alert: You are at ${util}% of your maximum overall drawdown capacity. Close risk exposure!`;
      } else if (util < 90) {
        severity = "CAUTION";
        msg = `Maximum Drawdown Caution: You have reached ${util}% of your maximum overall drawdown capacity.`;
      }
      warnings.push({ id: "overall", severity, msg });
    }

    if (warnings.length === 0) return null;

    return (
      <div className="space-y-2">
        {warnings.map((w) => (
          <div 
            key={w.id} 
            className={`flex items-start gap-3 p-3.5 border rounded-lg animate-pulse ${
              w.severity === "CRITICAL" 
                ? "bg-red-950/20 border-red-900/50 text-red-400" 
                : w.severity === "WARNING"
                ? "bg-orange-950/20 border-orange-900/50 text-orange-400"
                : "bg-yellow-950/10 border-yellow-900/40 text-yellow-400"
            }`}
          >
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider block font-mono">{w.severity} LIMIT EXCEEDING</span>
              <p className="text-xs font-medium mt-0.5 leading-relaxed">{w.msg}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="text-sm text-gray-400">Loading your trading accounts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-900 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-100 sm:text-2xl font-poppins">Account Hub</h1>
          <p className="text-xs text-gray-500 mt-1">
            Create, manage, and configure prop-firm drawdown rules for your accounts.
          </p>
        </div>
        {!showCreateForm && !editAccountData && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="h-10 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>New Account</span>
          </button>
        )}
      </div>

      {/* Account Forms Area */}
      {showCreateForm && (
        <div className="bg-gray-950 border border-gray-900 p-6 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-gray-900 pb-3">
            <h2 className="text-sm font-semibold text-gray-250">Create New Account</h2>
          </div>
          <AccountForm
            onSuccess={() => {
              setShowCreateForm(false);
              fetchAccounts();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {editAccountData && (
        <div className="bg-gray-950 border border-gray-900 p-6 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-gray-900 pb-3">
            <h2 className="text-sm font-semibold text-gray-250">Edit Account Settings</h2>
          </div>
          <AccountForm
            initialData={editAccountData}
            onSuccess={() => {
              setEditAccountData(null);
              fetchAccounts();
            }}
            onCancel={() => setEditAccountData(null)}
          />
        </div>
      )}

      {/* Main Panels */}
      {!showCreateForm && !editAccountData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Account Lists Tabs */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">
              Your Accounts ({accounts.length})
            </h3>
            {accounts.length === 0 ? (
              <div className="bg-gray-900/10 border border-gray-900 rounded-lg p-8 text-center space-y-4">
                <p className="text-xs text-gray-500">No trading accounts found. Please create one to begin logging trades.</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-2 bg-blue-600/10 border border-blue-500 text-blue-400 rounded text-xs font-medium"
                >
                  Create First Account
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {accounts.map((acc) => {
                  const isActive = acc.id === activeTab;
                  const profit = Number(acc.currentBalance) - Number(acc.startingBalance);
                  const growth = Number(acc.startingBalance) > 0 ? (profit / Number(acc.startingBalance)) * 100 : 0;
                  
                  // Label mapped account type beautifully
                  const accountTypeLabel = acc.accountType === "PROP_CHALLENGE" 
                    ? "Challenge" 
                    : acc.accountType === "PROP_FUNDED"
                    ? "Funded"
                    : acc.accountType === "LIVE"
                    ? "Personal Live"
                    : "Demo";

                  return (
                    <div
                      key={acc.id}
                      onClick={() => setActiveTab(acc.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition flex flex-col justify-between hover:bg-gray-900/30 ${
                        isActive
                          ? "bg-blue-600/5 border-blue-500/80"
                          : "bg-gray-950 border-gray-900"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs sm:text-sm text-gray-200">
                              {acc.name}
                            </span>
                            {acc.isDefault && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600/10 text-blue-400 border border-blue-500/30">
                                Default
                              </span>
                            )}
                            {!acc.isDefault && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetDefault(acc.id);
                                }}
                                title="Set as default"
                                className="text-gray-600 hover:text-blue-400 transition"
                              >
                                <Star className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 font-mono uppercase mt-0.5">
                            {acc.brokerName || "No Broker"} • {accountTypeLabel}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditAccountData(acc);
                            }}
                            className="p-1 text-gray-500 hover:text-gray-300 transition"
                            title="Edit account configuration"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                          </button>
                          {confirmDeleteId === acc.id ? (
                            <div className="flex items-center gap-1 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[9px] text-red-400 font-bold font-mono">Delete?</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(acc.id);
                                }}
                                className="p-0.5 bg-red-600 hover:bg-red-500 text-white rounded transition"
                                title="Confirm delete"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(null);
                                }}
                                className="p-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition"
                                title="Cancel"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(acc.id);
                              }}
                              className="p-1 text-gray-700 hover:text-red-400 transition"
                              title="Delete account"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex justify-between items-end">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Balance</p>
                          <p className="text-sm sm:text-base font-bold text-gray-350 font-mono mt-0.5">
                            {formatCurrency(Number(acc.currentBalance), acc.currency)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold font-poppins">Growth</p>
                          <span
                            className={`inline-block text-xs font-bold font-mono mt-0.5 ${
                              profit >= 0 ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {profit >= 0 ? "+" : ""}
                            {growth.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Account Details & Performance Analytics */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedDetails ? (
              <div className="bg-gray-950 border border-gray-900 rounded-lg p-12 text-center text-gray-500 text-xs">
                Select an account to view drawdown limits and metrics performance.
              </div>
            ) : (
              <>
                {/* Drawdown warnings display */}
                {renderDrawdownWarnings()}

                {/* Dashboard tailored by Account Type */}
                {selectedDetails.accountInfo.accountType === "PROP_CHALLENGE" && (
                  <div className="space-y-4">
                    {/* Header bar showing Challenge Info */}
                    <div className="bg-gray-950 border border-gray-900 p-5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600/10 text-blue-450 border border-blue-500/20">
                            PROP CHALLENGE
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            {selectedDetails.accountInfo.challengeName || "Custom"}
                          </span>
                        </div>
                        <h2 className="text-base font-bold text-gray-200 mt-1">
                          Phase Progression Dashboard
                        </h2>
                      </div>
                      
                      {/* Challenge status badge */}
                      <div>
                        {(() => {
                          const status = selectedDetails.accountInfo.challengeStatus;
                          let color = "bg-blue-600/10 text-blue-400 border-blue-500/30";
                          if (status === "CHALLENGE_PASSED") color = "bg-green-600/10 text-green-400 border-green-500/30";
                          if (status === "READY_FOR_NEXT_PHASE" || status === "PHASE_COMPLETED") color = "bg-purple-600/10 text-purple-400 border-purple-500/30";
                          if (status === "FAILED") color = "bg-red-600/10 text-red-400 border-red-500/30";
                          return (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border ${color}`}>
                              {status?.replace(/_/g, " ")}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Prop Challenge Dashboard Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="bg-gray-950 border border-gray-900 p-4 rounded-lg">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Current Phase</p>
                        <p className="text-base font-bold text-gray-200 mt-1.5 font-poppins">
                          Phase {selectedDetails.accountInfo.currentPhaseNumber} of {selectedDetails.accountInfo.phasesCount}
                        </p>
                      </div>

                      <div className="bg-gray-950 border border-gray-900 p-4 rounded-lg col-span-1">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Target Status</p>
                        <p className="text-base font-bold text-gray-250 mt-1.5 font-mono">
                          {selectedDetails.accountInfo.currentProfitPercent.toFixed(2)}% / {selectedDetails.accountInfo.currentPhaseTargetPercent}%
                        </p>
                      </div>

                      <div className="bg-gray-950 border border-gray-900 p-4 rounded-lg col-span-1">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Pass Probability</p>
                        <p className="text-base font-bold text-green-400 mt-1.5 font-mono">
                          {selectedDetails.accountInfo.passProbability}%
                        </p>
                      </div>
                    </div>

                    {/* Progress tracking card */}
                    <div className="bg-gray-950 border border-gray-900 p-5 rounded-lg space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-450 uppercase font-bold tracking-wider text-[10px]">Phase Profit Progress</span>
                        <span className="font-mono font-bold text-blue-400">
                          {selectedDetails.accountInfo.progressPercent.toFixed(1)}% Completed
                        </span>
                      </div>
                      <div className="h-3 bg-gray-900 border border-gray-850 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${selectedDetails.accountInfo.progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                        <span>Current Profit: {selectedDetails.accountInfo.currentProfitPercent.toFixed(2)}%</span>
                        {selectedDetails.accountInfo.remainingTargetPercent > 0 ? (
                          <span>Remaining to Target: {selectedDetails.accountInfo.remainingTargetPercent.toFixed(2)}%</span>
                        ) : (
                          <span className="text-green-400 font-bold">Target Cleared!</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {selectedDetails.accountInfo.accountType === "PROP_FUNDED" && (
                  <div className="bg-gray-950 border border-gray-900 p-5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-600/10 text-green-400 border border-green-500/20">
                          FUNDED ACCOUNT
                        </span>
                        {selectedDetails.accountInfo.fundedSince && (
                          <span className="text-xs text-gray-500 font-mono">
                            Since {new Date(selectedDetails.accountInfo.fundedSince).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <h2 className="text-base font-bold text-gray-200 mt-1">
                        Live Funded Dashboard
                      </h2>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase font-semibold">Profit Split</p>
                        <p className="text-sm font-bold text-gray-300 font-mono">
                          {selectedDetails.accountInfo.profitSplit || 80}% / {100 - (selectedDetails.accountInfo.profitSplit || 80)}%
                        </p>
                      </div>
                      <span className="h-8 w-[1px] bg-gray-900" />
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase font-semibold">Funded Status</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-600/10 text-green-400 border border-green-500/30">
                          ACTIVE FUNDING
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Drawdown rules display */}
                <div className="bg-gray-950 border border-gray-900 p-6 rounded-lg space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-900 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-blue-500" />
                      <h3 className="text-sm font-semibold text-gray-250">Drawdown Rules Monitoring</h3>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 uppercase">
                      Real-time calculations
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Daily Drawdown Meter */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Daily Drawdown</span>
                        <span className={getDrawdownTextColor(
                          selectedDetails.drawdown.dailyDrawdownPercent,
                          selectedDetails.accountInfo.limits.maxDailyDrawdown
                        )}>
                          {selectedDetails.drawdown.dailyDrawdownPercent.toFixed(2)}% /{" "}
                          {selectedDetails.accountInfo.limits.maxDailyDrawdown
                            ? `${selectedDetails.accountInfo.limits.maxDailyDrawdown}%`
                            : "No Limit"}
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-900 border border-gray-850 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${getDrawdownColor(
                            selectedDetails.drawdown.dailyDrawdownPercent,
                            selectedDetails.accountInfo.limits.maxDailyDrawdown
                          )}`}
                          style={{
                            width: `${Math.min(
                              100,
                              selectedDetails.accountInfo.limits.maxDailyDrawdown
                                ? (selectedDetails.drawdown.dailyDrawdownPercent /
                                    selectedDetails.accountInfo.limits.maxDailyDrawdown) *
                                    100
                                : 0
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Overall Drawdown Meter */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Overall Drawdown</span>
                        <span className={getDrawdownTextColor(
                          selectedDetails.drawdown.overallDrawdownPercent,
                          selectedDetails.accountInfo.limits.maxOverallDrawdown
                        )}>
                          {selectedDetails.drawdown.overallDrawdownPercent.toFixed(2)}% /{" "}
                          {selectedDetails.accountInfo.limits.maxOverallDrawdown
                            ? `${selectedDetails.accountInfo.limits.maxOverallDrawdown}%`
                            : "No Limit"}
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-900 border border-gray-850 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${getDrawdownColor(
                            selectedDetails.drawdown.overallDrawdownPercent,
                            selectedDetails.accountInfo.limits.maxOverallDrawdown
                          )}`}
                          style={{
                            width: `${Math.min(
                              100,
                              selectedDetails.accountInfo.limits.maxOverallDrawdown
                                ? (selectedDetails.drawdown.overallDrawdownPercent /
                                    selectedDetails.accountInfo.limits.maxOverallDrawdown) *
                                    100
                                : 0
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Dashboard Financial Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-950 border border-gray-900 p-4 rounded-lg">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Starting Equity</p>
                    <p className="text-base sm:text-lg font-bold font-mono text-gray-300 mt-1">
                      {formatCurrency(selectedDetails.accountInfo.startingBalance, selectedDetails.accountInfo.currency)}
                    </p>
                  </div>
                  <div className="bg-gray-950 border border-gray-900 p-4 rounded-lg">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Current Equity</p>
                    <p className="text-base sm:text-lg font-bold font-mono text-gray-300 mt-1">
                      {formatCurrency(selectedDetails.accountInfo.currentBalance, selectedDetails.accountInfo.currency)}
                    </p>
                  </div>
                  <div className="bg-gray-950 border border-gray-900 p-4 rounded-lg">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Net Profit</p>
                    <p className={`text-base sm:text-lg font-bold font-mono mt-1 ${
                      selectedDetails.accountInfo.netProfit >= 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {selectedDetails.accountInfo.netProfit >= 0 ? "+" : ""}
                      {formatCurrency(selectedDetails.accountInfo.netProfit, selectedDetails.accountInfo.currency)}
                    </p>
                  </div>
                  <div className="bg-gray-950 border border-gray-900 p-4 rounded-lg">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Growth</p>
                    <p className={`text-base sm:text-lg font-bold font-mono mt-1 ${
                      selectedDetails.accountInfo.growthPercent >= 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {selectedDetails.accountInfo.growthPercent >= 0 ? "+" : ""}
                      {selectedDetails.accountInfo.growthPercent.toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Account Performance Metrics Panel */}
                <div className="bg-gray-950 border border-gray-900 p-6 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-900 pb-3">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <h3 className="text-sm font-semibold text-gray-205">Account Statistics</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Total Trades</p>
                      <p className="text-sm font-bold font-mono text-gray-300 mt-0.5">
                        {selectedDetails.performance.totalTrades}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Win Rate</p>
                      <p className="text-sm font-bold font-mono text-green-400 mt-0.5">
                        {selectedDetails.performance.winRate.toFixed(2)}%
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Loss Rate</p>
                      <p className="text-sm font-bold font-mono text-red-400 mt-0.5">
                        {selectedDetails.performance.lossRate.toFixed(2)}%
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Profit Factor</p>
                      <p className="text-sm font-bold font-mono text-gray-350 mt-0.5">
                        {selectedDetails.performance.profitFactor === null ||
                        selectedDetails.performance.profitFactor === undefined ||
                        selectedDetails.performance.profitFactor === Infinity
                          ? "∞"
                          : Number(selectedDetails.performance.profitFactor).toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Average RR</p>
                      <p className="text-sm font-bold font-mono text-gray-350 mt-0.5">
                        {selectedDetails.performance.averageRR.toFixed(2)} R
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Total Profit</p>
                      <p className="text-sm font-bold font-mono text-green-400 mt-0.5">
                        {formatCurrency(selectedDetails.performance.totalProfit, selectedDetails.accountInfo.currency)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Total Loss</p>
                      <p className="text-sm font-bold font-mono text-red-400 mt-0.5">
                        {formatCurrency(selectedDetails.performance.totalLoss, selectedDetails.accountInfo.currency)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Best Trade</p>
                      <p className="text-sm font-bold font-mono text-green-450 mt-0.5">
                        +{formatCurrency(selectedDetails.performance.bestTrade, selectedDetails.accountInfo.currency)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Worst Trade</p>
                      <p className="text-sm font-bold font-mono text-red-450 mt-0.5">
                        {formatCurrency(selectedDetails.performance.worstTrade, selectedDetails.accountInfo.currency)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Session Breakdown */}
                <div className="bg-gray-950 border border-gray-900 p-6 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-900 pb-3">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <h3 className="text-sm font-semibold text-gray-205">Session Breakdown</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-900/40 p-4 border border-gray-900 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase">Best Trading Session</p>
                        <p className="text-sm font-bold text-gray-200 mt-0.5 font-mono">
                          {selectedDetails.sessionStats.bestSessionName ? selectedDetails.sessionStats.bestSessionName.replace(/_/g, " ") : "N/A"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase">PnL</p>
                        <p className="text-sm font-bold text-green-450 font-mono mt-0.5">
                          +{formatCurrency(selectedDetails.sessionStats.bestSessionPnl, selectedDetails.accountInfo.currency)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-900/40 p-4 border border-gray-900 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase">Worst Trading Session</p>
                        <p className="text-sm font-bold text-gray-200 mt-0.5 font-mono">
                          {selectedDetails.sessionStats.worstSessionName ? selectedDetails.sessionStats.worstSessionName.replace(/_/g, " ") : "N/A"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase">PnL</p>
                        <p className={`text-sm font-bold font-mono mt-0.5 ${
                          selectedDetails.sessionStats.worstSessionPnl >= 0 ? "text-green-450" : "text-red-450"
                        }`}>
                          {selectedDetails.sessionStats.worstSessionPnl >= 0 ? "+" : ""}
                          {formatCurrency(selectedDetails.sessionStats.worstSessionPnl, selectedDetails.accountInfo.currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Celebration Modal for Phase Completions */}
      {celebrationPhase && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gray-950 border border-gray-900 max-w-md w-full rounded-xl p-6 text-center space-y-6 animate-scale-in">
            <div className="mx-auto w-16 h-16 bg-purple-600/10 rounded-full flex items-center justify-center border border-purple-500/20 text-purple-400">
              <Sparkles className="h-8 w-8 animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest font-mono">STAGE CLEARED</span>
              <h3 className="text-xl font-bold text-gray-100 font-poppins">
                {celebrationPhase.phaseName} Completed!
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Congratulations! You hit the target of <span className="text-purple-400 font-bold">{celebrationPhase.profitTarget}%</span> while respecting all risk parameters. Proceed to validation or configure the next phase.
              </p>
            </div>

            <button
              onClick={() => handleAcknowledgeCelebration(celebrationPhase.id)}
              className="w-full h-11 bg-purple-650 hover:bg-purple-600 text-white rounded font-semibold text-xs tracking-wider uppercase transition font-poppins"
            >
              Continue Challenge
            </button>
          </div>
        </div>
      )}

      {/* Celebration Modal for Final Challenge Passed */}
      {isFinalCelebration && selectedDetails && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gray-950 border border-purple-900/40 max-w-lg w-full rounded-xl p-8 text-center space-y-6 animate-scale-in relative overflow-hidden">
            {/* Background glowing highlights */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-yellow-500/20 to-amber-500/10 rounded-full flex items-center justify-center border border-yellow-500/30 text-yellow-550 shadow-lg">
              <Trophy className="h-10 w-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest font-mono">CHALLENGE CLEARED</span>
              <h3 className="text-2xl font-bold text-gray-100 font-poppins">
                Prop Challenge Passed!
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
                Outstanding trading performance! You have successfully completed all phases of the challenge. Your funding allocation is being prepared.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-gray-900/50 p-4 border border-gray-900 rounded-lg">
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-semibold">Total Phases Cleared</p>
                <p className="text-sm font-bold text-gray-300 mt-0.5 font-poppins">
                  {selectedDetails.accountInfo.phasesCount} Phases
                </p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-semibold">Ending Balance</p>
                <p className="text-sm font-bold text-green-400 mt-0.5 font-mono">
                  {formatCurrency(Number(selectedDetails.accountInfo.currentBalance), selectedDetails.accountInfo.currency)}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const finalPhase = selectedDetails.accountInfo.phases[selectedDetails.accountInfo.phases.length - 1];
                if (finalPhase) {
                  handleAcknowledgeCelebration(finalPhase.id);
                } else {
                  setIsFinalCelebration(false);
                }
              }}
              className="w-full h-11 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-semibold text-xs tracking-wider uppercase transition font-poppins"
            >
              Claim Funded Badge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
