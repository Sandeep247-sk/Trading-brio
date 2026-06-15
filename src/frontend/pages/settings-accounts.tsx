"use client";

import React, { useEffect, useState } from "react";
import { AccountForm } from "@/components/accounts/account-form";
import { toast } from "sonner";
import { 
  Plus, 
  Settings2, 
  Trash2, 
  Star, 
  StarOff, 
  ChevronRight, 
  LineChart, 
  Activity, 
  TrendingUp, 
  ShieldAlert, 
  AlertTriangle,
  Loader2,
  X,
  Check
} from "lucide-react";

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
    limits: {
      maxRiskPerTrade: number | null;
      maxDailyDrawdown: number | null;
      maxWeeklyDrawdown: number | null;
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
    weeklyDrawdownPercent: number;
    overallDrawdownPercent: number;
    dailyDrawdownAmt: number;
    weeklyDrawdownAmt: number;
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

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0) {
          // Default to the first account or default account
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
        // Clear activeTab if we deleted the current active account
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

  // Helper to color code drawdown meters
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
          <h1 className="text-xl font-bold tracking-tight text-gray-100 sm:text-2xl">Account Hub</h1>
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
        <div className="bg-gray-950 border border-gray-950 p-6 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-gray-900 pb-3">
            <h2 className="text-sm font-semibold text-gray-200">Create New Account</h2>
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
        <div className="bg-gray-950 border border-gray-950 p-6 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-gray-900 pb-3">
            <h2 className="text-sm font-semibold text-gray-200">Edit Account Settings</h2>
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
                  return (
                    <div
                      key={acc.id}
                      onClick={() => setActiveTab(acc.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition flex flex-col justify-between hover:bg-gray-900/30 ${
                        isActive
                          ? "bg-blue-600/5 border-blue-500/80"
                          : "bg-gray-950 border-gray-850"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs sm:text-sm text-gray-200">
                              {acc.name}
                            </span>
                            {acc.isDefault ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600/10 text-blue-400 border border-blue-500/30">
                                Default
                              </span>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetDefault(acc.id);
                                }}
                                title="Set as default"
                                className="text-gray-650 hover:text-blue-400 transition"
                              >
                                <Star className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 font-mono uppercase mt-0.5">
                            {acc.brokerName || "No Broker"} • {acc.accountType ? acc.accountType.replace(/_/g, " ") : "LIVE"}
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
                              <span className="text-[9px] text-red-400 font-bold">Delete?</span>
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
                              className="p-1 text-gray-650 hover:text-red-400 transition"
                              title="Delete account"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex justify-between items-end">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Balance</p>
                          <p className="text-sm sm:text-base font-bold text-gray-300 font-mono mt-0.5">
                            {formatCurrency(Number(acc.currentBalance), acc.currency)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Growth</p>
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
              <div className="bg-gray-950 border border-gray-850 rounded-lg p-12 text-center text-gray-500 text-xs">
                Select an account to view drawdown limits and metrics performance.
              </div>
            ) : (
              <>
                {/* Prop Firm Drawdown Overview */}
                <div className="bg-gray-950 border border-gray-850 p-6 rounded-lg space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-900 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-blue-500" />
                      <h3 className="text-sm font-semibold text-gray-200">Drawdown Rules Monitoring</h3>
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
                      {selectedDetails.accountInfo.limits.maxDailyDrawdown && 
                       (selectedDetails.drawdown.dailyDrawdownPercent / selectedDetails.accountInfo.limits.maxDailyDrawdown >= 0.8) && (
                        <div className="flex items-center gap-1 text-[10px] text-red-400 bg-red-950/20 border border-red-900/30 p-1.5 rounded">
                          <AlertTriangle className="h-3 w-3" />
                          <span>WARNING: Approaching daily drawdown limit! Avoid opening new trades today.</span>
                        </div>
                      )}
                    </div>

                    {/* Weekly Drawdown Meter */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Weekly Drawdown</span>
                        <span className={getDrawdownTextColor(
                          selectedDetails.drawdown.weeklyDrawdownPercent,
                          selectedDetails.accountInfo.limits.maxWeeklyDrawdown
                            ? Number(selectedDetails.accountInfo.limits.maxWeeklyDrawdown)
                            : null
                        )}>
                          {selectedDetails.drawdown.weeklyDrawdownPercent.toFixed(2)}% /{" "}
                          {selectedDetails.accountInfo.limits.maxWeeklyDrawdown
                            ? `${selectedDetails.accountInfo.limits.maxWeeklyDrawdown}%`
                            : "No Limit"}
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-900 border border-gray-850 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${getDrawdownColor(
                            selectedDetails.drawdown.weeklyDrawdownPercent,
                            selectedDetails.accountInfo.limits.maxWeeklyDrawdown
                              ? Number(selectedDetails.accountInfo.limits.maxWeeklyDrawdown)
                              : null
                          )}`}
                          style={{
                            width: `${Math.min(
                              100,
                              selectedDetails.accountInfo.limits.maxWeeklyDrawdown
                                ? (selectedDetails.drawdown.weeklyDrawdownPercent /
                                    Number(selectedDetails.accountInfo.limits.maxWeeklyDrawdown)) *
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
                  <div className="bg-gray-950 border border-gray-850 p-4 rounded-lg">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Starting Equity</p>
                    <p className="text-base sm:text-lg font-bold font-mono text-gray-300 mt-1">
                      {formatCurrency(selectedDetails.accountInfo.startingBalance, selectedDetails.accountInfo.currency)}
                    </p>
                  </div>
                  <div className="bg-gray-950 border border-gray-850 p-4 rounded-lg">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Current Equity</p>
                    <p className="text-base sm:text-lg font-bold font-mono text-gray-300 mt-1">
                      {formatCurrency(selectedDetails.accountInfo.currentBalance, selectedDetails.accountInfo.currency)}
                    </p>
                  </div>
                  <div className="bg-gray-950 border border-gray-850 p-4 rounded-lg">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Net Profit</p>
                    <p className={`text-base sm:text-lg font-bold font-mono mt-1 ${
                      selectedDetails.accountInfo.netProfit >= 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {selectedDetails.accountInfo.netProfit >= 0 ? "+" : ""}
                      {formatCurrency(selectedDetails.accountInfo.netProfit, selectedDetails.accountInfo.currency)}
                    </p>
                  </div>
                  <div className="bg-gray-950 border border-gray-850 p-4 rounded-lg">
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
                <div className="bg-gray-950 border border-gray-850 p-6 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-900 pb-3">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <h3 className="text-sm font-semibold text-gray-200">Account Statistics</h3>
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
                <div className="bg-gray-950 border border-gray-850 p-6 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-900 pb-3">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <h3 className="text-sm font-semibold text-gray-200">Session Breakdown</h3>
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
    </div>
  );
}
