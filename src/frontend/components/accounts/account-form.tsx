"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AccountType, TradingPlatform } from "@prisma/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PhaseState {
  phaseNumber: number;
  phaseName: string;
  profitTarget: string;
  dailyDrawdownLimit: string;
  maxDrawdownLimit: string;
}

interface AccountFormProps {
  initialData?: any; // For editing
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const AccountForm: React.FC<AccountFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
}) => {
  const router = useRouter();
  const isEdit = !!initialData;

  const [name, setName] = useState(initialData?.name || "");
  const [brokerName, setBrokerName] = useState(initialData?.brokerName || "");
  const [accountType, setAccountType] = useState<AccountType>(
    initialData?.accountType || AccountType.LIVE
  );
  const [platform, setPlatform] = useState<TradingPlatform>(
    initialData?.platform || TradingPlatform.MT5
  );
  const [accountNumber, setAccountNumber] = useState(
    initialData?.accountNumber || ""
  );
  const [startingBalance, setStartingBalance] = useState<string>(
    initialData?.startingBalance ? String(initialData.startingBalance) : "10000"
  );
  const [currency, setCurrency] = useState(initialData?.currency || "USD");
  const [isDefault, setIsDefault] = useState(!!initialData?.isDefault);

  // Prop challenge specific states
  const [challengeName, setChallengeName] = useState<string>(() => {
    if (initialData?.challengeName) {
      const names = ["Funding Pips", "FTMO", "Alpha Capital", "FundedNext"];
      if (names.includes(initialData.challengeName)) {
        return initialData.challengeName;
      }
      return "Custom";
    }
    return "FTMO";
  });
  const [customChallengeName, setCustomChallengeName] = useState<string>(() => {
    if (initialData?.challengeName) {
      const names = ["Funding Pips", "FTMO", "Alpha Capital", "FundedNext"];
      if (!names.includes(initialData.challengeName)) {
        return initialData.challengeName;
      }
    }
    return "";
  });
  const [phasesCount, setPhasesCount] = useState<number>(initialData?.phasesCount || 2);

  // Funded account specific states
  const [fundedSince, setFundedSince] = useState<string>(() => {
    if (initialData?.fundedSince) {
      return new Date(initialData.fundedSince).toISOString().split("T")[0];
    }
    return "";
  });
  const [profitSplit, setProfitSplit] = useState<string>(
    initialData?.profitSplit ? String(initialData.profitSplit) : "80"
  );

  // Risk & Drawdown Limits (for Demo/Live/Funded)
  const [maxRiskPerTrade, setMaxRiskPerTrade] = useState<string>(
    initialData?.maxRiskPerTrade ? String(initialData.maxRiskPerTrade) : ""
  );
  const [maxDailyDrawdown, setMaxDailyDrawdown] = useState<string>(
    initialData?.maxDailyDrawdown ? String(initialData.maxDailyDrawdown) : ""
  );
  const [maxOverallDrawdown, setMaxOverallDrawdown] = useState<string>(
    initialData?.maxOverallDrawdown ? String(initialData.maxOverallDrawdown) : ""
  );
  const [maxTradesPerDay, setMaxTradesPerDay] = useState<string>(
    initialData?.maxTradesPerDay ? String(initialData.maxTradesPerDay) : ""
  );

  // Dynamic Phases array state
  const getDefaultPhases = (count: number): PhaseState[] => {
    return Array.from({ length: count }, (_, i) => ({
      phaseNumber: i + 1,
      phaseName: `Phase ${i + 1}`,
      profitTarget: i === 0 ? "8" : "5",
      dailyDrawdownLimit: "5",
      maxDrawdownLimit: "10",
    }));
  };

  const [phases, setPhases] = useState<PhaseState[]>(() => {
    if (initialData?.phases && initialData.phases.length > 0) {
      return initialData.phases.map((p: any) => ({
        phaseNumber: p.phaseNumber,
        phaseName: p.phaseName,
        profitTarget: String(p.profitTarget),
        dailyDrawdownLimit: String(p.dailyDrawdownLimit),
        maxDrawdownLimit: String(p.maxDrawdownLimit),
      }));
    }
    return getDefaultPhases(initialData?.phasesCount || 2);
  });

  const handlePhasesCountChange = (count: number) => {
    setPhasesCount(count);
    setPhases((prev) => {
      if (prev.length === count) return prev;
      if (prev.length < count) {
        const newPhases = [...prev];
        for (let i = prev.length; i < count; i++) {
          newPhases.push({
            phaseNumber: i + 1,
            phaseName: `Phase ${i + 1}`,
            profitTarget: i === 0 ? "8" : "5",
            dailyDrawdownLimit: "5",
            maxDrawdownLimit: "10",
          });
        }
        return newPhases;
      } else {
        return prev.slice(0, count);
      }
    });
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!name.trim()) {
      toast.error("Account name is required.");
      return;
    }
    const parsedBalance = parseFloat(startingBalance);
    if (isNaN(parsedBalance) || parsedBalance <= 0) {
      toast.error("Starting balance must be greater than zero.");
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading(
      isEdit ? "Updating account details..." : "Creating trading account..."
    );

    try {
      const payload = {
        name,
        brokerName: brokerName.trim() || null,
        accountType,
        platform,
        accountNumber: accountNumber.trim() || null,
        startingBalance: parsedBalance,
        currency,
        isDefault,
        maxRiskPerTrade: maxRiskPerTrade ? parseFloat(maxRiskPerTrade) : null,
        maxDailyDrawdown: accountType !== AccountType.PROP_CHALLENGE && maxDailyDrawdown ? parseFloat(maxDailyDrawdown) : null,
        maxOverallDrawdown: accountType !== AccountType.PROP_CHALLENGE && maxOverallDrawdown ? parseFloat(maxOverallDrawdown) : null,
        maxTradesPerDay: maxTradesPerDay ? parseInt(maxTradesPerDay, 10) : null,

        // Prop firm fields
        challengeName: accountType === AccountType.PROP_CHALLENGE
          ? (challengeName === "Custom" ? customChallengeName : challengeName)
          : null,
        phasesCount: accountType === AccountType.PROP_CHALLENGE ? Number(phasesCount) : null,
        fundedSince: accountType === AccountType.PROP_FUNDED ? (fundedSince || null) : null,
        profitSplit: accountType === AccountType.PROP_FUNDED ? parseFloat(profitSplit) : null,

        // Nested phases
        phases: accountType === AccountType.PROP_CHALLENGE
          ? phases.map((p) => ({
              phaseNumber: p.phaseNumber,
              phaseName: p.phaseName,
              profitTarget: parseFloat(p.profitTarget),
              dailyDrawdownLimit: parseFloat(p.dailyDrawdownLimit),
              maxDrawdownLimit: parseFloat(p.maxDrawdownLimit),
            }))
          : undefined,
      };

      const url = isEdit ? `/api/accounts/${initialData.id}` : "/api/accounts";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save account");
      }

      toast.dismiss(loadingToast);
      toast.success(
        isEdit ? "Account updated successfully" : "Trading account created successfully"
      );

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/settings/accounts");
        router.refresh();
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "Failed to save account");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4 bg-gray-900/40 p-5 border border-gray-800 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-250 uppercase tracking-wider">
            General Info
          </h3>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Account Name</label>
              <input
                type="text"
                placeholder="e.g. My Funded 50K"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 bg-gray-950 border border-gray-850 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500 font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Broker Name</label>
                <input
                  type="text"
                  placeholder="e.g. ThinkMarkets"
                  value={brokerName}
                  onChange={(e) => setBrokerName(e.target.value)}
                  className="w-full h-10 px-3 bg-gray-950 border border-gray-850 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Account Number (Opt)</label>
                <input
                  type="text"
                  placeholder="e.g. 102559"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full h-10 px-3 bg-gray-950 border border-gray-850 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Account Type</label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                  className="w-full h-10 px-3 bg-gray-950 border border-gray-850 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500"
                >
                  <option value={AccountType.DEMO}>Personal Demo Account</option>
                  <option value={AccountType.LIVE}>Personal Live Account</option>
                  <option value={AccountType.PROP_CHALLENGE}>Prop Firm Challenge</option>
                  <option value={AccountType.PROP_FUNDED}>Funded Prop Account</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as TradingPlatform)}
                  className="w-full h-10 px-3 bg-gray-950 border border-gray-850 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500"
                >
                  <option value={TradingPlatform.MT4}>MT4</option>
                  <option value={TradingPlatform.MT5}>MT5</option>
                  <option value={TradingPlatform.TRADINGVIEW}>TradingView</option>
                  <option value={TradingPlatform.CTRADER}>cTrader</option>
                  <option value={TradingPlatform.DXTRADE}>DXTrade</option>
                  <option value={TradingPlatform.OTHER}>Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Starting Balance</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Starting Balance"
                  value={startingBalance}
                  onChange={(e) => setStartingBalance(e.target.value)}
                  className="w-full h-10 px-3 bg-gray-950 border border-gray-850 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500 font-mono font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-10 px-3 bg-gray-950 border border-gray-850 rounded text-sm text-gray-300 focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-gray-800 bg-gray-950 text-blue-600 focus:ring-0"
              />
              <label htmlFor="isDefault" className="text-xs font-medium text-gray-400 cursor-pointer select-none">
                Set as Default Trading Account
              </label>
            </div>
          </div>
        </div>

        {/* Dynamic configurations based on account type selection */}
        <div className="space-y-4 bg-gray-900/40 p-5 border border-gray-800 rounded-lg">
          {accountType === AccountType.PROP_CHALLENGE ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-250 uppercase tracking-wider">
                Prop Challenge Config
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Challenge Name</label>
                  <select
                    value={challengeName}
                    onChange={(e) => setChallengeName(e.target.value)}
                    className="w-full h-10 px-3 bg-gray-950 border border-gray-850 rounded text-sm text-gray-300 focus:outline-none"
                  >
                    <option value="Funding Pips">Funding Pips</option>
                    <option value="FTMO">FTMO</option>
                    <option value="Alpha Capital">Alpha Capital</option>
                    <option value="FundedNext">FundedNext</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Phases</label>
                  <select
                    value={phasesCount}
                    onChange={(e) => handlePhasesCountChange(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-gray-950 border border-gray-850 rounded text-sm text-gray-300 focus:outline-none"
                  >
                    <option value={1}>1 Phase</option>
                    <option value={2}>2 Phase</option>
                    <option value={3}>3 Phase</option>
                  </select>
                </div>
              </div>

              {challengeName === "Custom" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Custom Challenge Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Funding"
                    value={customChallengeName}
                    onChange={(e) => setCustomChallengeName(e.target.value)}
                    className="w-full h-10 px-3 bg-gray-950 border border-gray-850 rounded text-sm text-gray-300 focus:outline-none"
                    required={challengeName === "Custom"}
                  />
                </div>
              )}

              {/* Dynamic Phases Config */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-gray-450 uppercase tracking-wider">
                  Phase Parameters
                </h4>
                {phases.map((phase, idx) => (
                  <div key={idx} className="bg-gray-950/80 border border-gray-850/80 p-3.5 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-blue-400 font-mono">
                        Phase {phase.phaseNumber} Settings
                      </span>
                      <input
                        type="text"
                        value={phase.phaseName}
                        onChange={(e) => {
                          const newPhases = [...phases];
                          newPhases[idx].phaseName = e.target.value;
                          setPhases(newPhases);
                        }}
                        className="h-6 px-2 text-[10px] bg-gray-900 border border-gray-800 rounded text-gray-300 w-24 text-right"
                        placeholder="Phase Name"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Target %</label>
                        <input
                          type="number"
                          step="0.1"
                          value={phase.profitTarget}
                          onChange={(e) => {
                            const newPhases = [...phases];
                            newPhases[idx].profitTarget = e.target.value;
                            setPhases(newPhases);
                          }}
                          className="w-full h-8 px-2 bg-gray-900 border border-gray-850 rounded text-xs text-gray-350 font-mono"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Daily DD %</label>
                        <input
                          type="number"
                          step="0.1"
                          value={phase.dailyDrawdownLimit}
                          onChange={(e) => {
                            const newPhases = [...phases];
                            newPhases[idx].dailyDrawdownLimit = e.target.value;
                            setPhases(newPhases);
                          }}
                          className="w-full h-8 px-2 bg-gray-900 border border-gray-850 rounded text-xs text-gray-350 font-mono"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Max DD %</label>
                        <input
                          type="number"
                          step="0.1"
                          value={phase.maxDrawdownLimit}
                          onChange={(e) => {
                            const newPhases = [...phases];
                            newPhases[idx].maxDrawdownLimit = e.target.value;
                            setPhases(newPhases);
                          }}
                          className="w-full h-8 px-2 bg-gray-900 border border-gray-850 rounded text-xs text-gray-350 font-mono"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-250 uppercase tracking-wider">
                {accountType === AccountType.PROP_FUNDED ? "Funded Account Config" : "Risk & Drawdown Rules"}
              </h3>

              {accountType === AccountType.PROP_FUNDED && (
                <div className="grid grid-cols-2 gap-3 bg-gray-950 p-4 border border-gray-850 rounded-lg">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Funded Since</label>
                    <input
                      type="date"
                      value={fundedSince}
                      onChange={(e) => setFundedSince(e.target.value)}
                      className="w-full h-10 px-3 bg-gray-900 border border-gray-800 rounded text-sm text-gray-300 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Profit Split (%)</label>
                    <input
                      type="number"
                      placeholder="e.g. 80"
                      value={profitSplit}
                      onChange={(e) => setProfitSplit(e.target.value)}
                      className="w-full h-10 px-3 bg-gray-900 border border-gray-800 rounded text-sm text-gray-300 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Max Risk / Trade (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 1.0"
                      value={maxRiskPerTrade}
                      onChange={(e) => setMaxRiskPerTrade(e.target.value)}
                      className="w-full h-10 px-3 bg-gray-950 border border-gray-850 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Max Trades / Day</label>
                    <input
                      type="number"
                      placeholder="e.g. 5"
                      value={maxTradesPerDay}
                      onChange={(e) => setMaxTradesPerDay(e.target.value)}
                      className="w-full h-10 px-3 bg-gray-950 border border-gray-850 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-450 uppercase">Max Daily Drawdown (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 5.0"
                      value={maxDailyDrawdown}
                      onChange={(e) => setMaxDailyDrawdown(e.target.value)}
                      className="w-full h-10 px-3 bg-gray-950 border border-gray-850 rounded text-sm text-gray-350 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-455 uppercase">Max Overall Drawdown (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 10.0"
                      value={maxOverallDrawdown}
                      onChange={(e) => setMaxOverallDrawdown(e.target.value)}
                      className="w-full h-10 px-3 bg-gray-950 border border-gray-850 rounded text-sm text-gray-355 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-gray-500 leading-relaxed">
                  * Daily Drawdown is computed dynamically based on the starting equity of each day. Overall Drawdown compares current equity to the initial starting account balance.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-gray-900">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 h-10 border border-gray-800 hover:bg-gray-900 rounded text-xs font-semibold text-gray-400 hover:text-white transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{isEdit ? "Update Account" : "Create Account"}</span>
          )}
        </button>
      </div>
    </form>
  );
};
