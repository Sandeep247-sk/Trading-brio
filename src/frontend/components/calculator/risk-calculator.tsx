"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Calculator, DollarSign, TrendingUp, Percent, Target, AlertTriangle, Info, Shield } from "lucide-react";

interface RiskCalculatorProps {
  accountBalance?: number;
  currency?: string;
  maxRiskPerTrade?: number | null;
}

export function RiskCalculator({ accountBalance = 10000, currency = "USD", maxRiskPerTrade }: RiskCalculatorProps) {
  const [balance, setBalance] = useState(accountBalance);
  const [riskPercent, setRiskPercent] = useState(maxRiskPerTrade ? Number(maxRiskPerTrade) : 1);
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [instrumentType, setInstrumentType] = useState<"forex" | "gold_jpy" | "crypto_indices">("forex");
  const [lotSize, setLotSize] = useState(100000); // Standard lot = 100,000 units
  const [pipValue, setPipValue] = useState(10); // $10 per pip for standard lot

  useEffect(() => {
    setBalance(accountBalance);
  }, [accountBalance]);

  useEffect(() => {
    if (instrumentType === "forex") {
      setLotSize(100000);
      setPipValue(10);
    } else if (instrumentType === "gold_jpy") {
      setLotSize(100000);
      setPipValue(1.0); // e.g. XAUUSD is $1/pip for standard lot (100 oz)
    } else {
      setLotSize(1);
      setPipValue(1.0);
    }
  }, [instrumentType]);

  const calculations = useMemo(() => {
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);

    const riskAmount = (balance * riskPercent) / 100;

    if (isNaN(entry) || isNaN(sl) || entry === sl) {
      return {
        riskAmount,
        rewardAmount: 0,
        positionSize: 0,
        rrRatio: 0,
        pipsAtRisk: 0,
        pipsToTarget: 0,
        direction: "N/A" as const,
        valid: false,
      };
    }

    const isLong = entry > sl;
    const direction = isLong ? "LONG" : "SHORT";

    // Determine pip size
    const pipSize = instrumentType === "forex" ? 0.0001 : instrumentType === "gold_jpy" ? 0.01 : 1.0;

    // Calculate pips
    const pipsAtRisk = Math.abs(entry - sl) / pipSize;
    const pipsToTarget = !isNaN(tp) && tp !== 0 ? Math.abs(tp - entry) / pipSize : 0;

    // Position size in standard lots/contracts
    const positionSizeLots = pipsAtRisk > 0 ? riskAmount / (pipsAtRisk * pipValue) : 0;
    const positionSize = positionSizeLots * lotSize;

    // R:R ratio
    const rrRatio = pipsAtRisk > 0 && pipsToTarget > 0 ? pipsToTarget / pipsAtRisk : 0;

    // Reward amount
    const rewardAmount = riskAmount * rrRatio;

    return {
      riskAmount,
      rewardAmount,
      positionSize,
      rrRatio,
      pipsAtRisk,
      pipsToTarget,
      direction,
      valid: true,
    };
  }, [balance, riskPercent, entryPrice, stopLoss, takeProfit, lotSize, pipValue, instrumentType]);

  const symbol = currency === "INR" ? "₹" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";

  const isRiskExceeded = maxRiskPerTrade && riskPercent > Number(maxRiskPerTrade);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator Inputs */}
        <div className="space-y-5 bg-gray-900/40 p-5 border border-gray-800 rounded-lg">
          <div className="flex items-center gap-2 border-b border-gray-900 pb-3">
            <Calculator className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-200">Position Calculator</h3>
          </div>

          <div className="space-y-4">
            {/* Account Balance */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Account Balance ({currency})</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{symbol}</span>
                <input
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                  className="w-full h-10 pl-7 pr-3 bg-gray-950 border border-gray-850 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500 font-mono font-bold"
                />
              </div>
            </div>

            {/* Instrument Type */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Instrument Type</label>
              <select
                value={instrumentType}
                onChange={(e) => setInstrumentType(e.target.value as any)}
                className="w-full h-10 px-3 bg-gray-950 border border-gray-850 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="forex">Forex (0.0001 Pip Size)</option>
                <option value="gold_jpy">Gold / JPY Pairs (0.01 Pip Size)</option>
                <option value="crypto_indices">Crypto / Indices (1.00 Point Size)</option>
              </select>
            </div>

            {/* Risk Percent */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-400">Risk Per Trade (%)</label>
                {maxRiskPerTrade && (
                  <span className="text-[9px] text-gray-500 font-mono">
                    Max: {Number(maxRiskPerTrade)}%
                  </span>
                )}
              </div>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                value={riskPercent}
                onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                className={`w-full h-10 px-3 bg-gray-950 border rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500 font-mono ${
                  isRiskExceeded ? "border-red-500/50" : "border-gray-850"
                }`}
              />
              {isRiskExceeded && (
                <div className="flex items-center gap-1 text-[10px] text-red-400">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Exceeds your max risk per trade limit of {Number(maxRiskPerTrade)}%</span>
                </div>
              )}
            </div>

            {/* Price Inputs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Entry Price</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 2350.50"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="w-full h-10 px-2 bg-gray-950 border border-gray-850 rounded text-xs text-gray-300 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Stop Loss</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 2345.00"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full h-10 px-2 bg-gray-950 border border-red-900/30 rounded text-xs text-gray-300 focus:outline-none focus:border-red-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Take Profit</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 2365.00"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-full h-10 px-2 bg-gray-950 border border-green-900/30 rounded text-xs text-gray-300 focus:outline-none focus:border-green-500 font-mono"
                />
              </div>
            </div>

            {/* Contract / Pip Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                  Lot Size (Units)
                  <Info className="h-3 w-3 text-gray-600" />
                </label>
                <select
                  value={lotSize}
                  onChange={(e) => setLotSize(parseInt(e.target.value))}
                  className="w-full h-10 px-2 bg-gray-950 border border-gray-850 rounded text-xs text-gray-300 focus:outline-none focus:border-blue-500"
                >
                  <option value={100000}>Standard (100,000)</option>
                  <option value={10000}>Mini (10,000)</option>
                  <option value={1000}>Micro (1,000)</option>
                  <option value={100}>Nano (100)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Pip Value ({symbol}/pip)</label>
                <input
                  type="number"
                  step="0.01"
                  value={pipValue}
                  onChange={(e) => setPipValue(parseFloat(e.target.value) || 0)}
                  className="w-full h-10 px-2 bg-gray-950 border border-gray-850 rounded text-xs text-gray-300 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {/* Direction Badge */}
          {calculations.valid && (
            <div className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-bold ${
              calculations.direction === "LONG"
                ? "bg-green-600/5 border-green-500/30 text-green-400"
                : "bg-red-600/5 border-red-500/30 text-red-400"
            }`}>
              <Shield className="h-4 w-4" />
              {calculations.direction} Position
            </div>
          )}

          {/* Result Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-950 border border-gray-850 p-4 rounded-lg">
              <div className="flex items-center gap-1.5 mb-2">
                <DollarSign className="h-3.5 w-3.5 text-red-400" />
                <p className="text-[9px] text-gray-500 uppercase font-bold">Risk Amount</p>
              </div>
              <p className="text-lg font-bold font-mono text-red-400">
                {symbol}{calculations.riskAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[9px] text-gray-500 mt-1">{riskPercent}% of {symbol}{balance.toLocaleString()}</p>
            </div>

            <div className="bg-gray-950 border border-gray-850 p-4 rounded-lg">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                <p className="text-[9px] text-gray-500 uppercase font-bold">Expected Reward</p>
              </div>
              <p className="text-lg font-bold font-mono text-green-400">
                {calculations.rewardAmount > 0
                  ? `${symbol}${calculations.rewardAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "—"}
              </p>
              <p className="text-[9px] text-gray-500 mt-1">
                {calculations.rrRatio > 0 ? `${calculations.rrRatio.toFixed(2)}x risk` : "Set TP"}
              </p>
            </div>

            <div className="bg-gray-950 border border-gray-850 p-4 rounded-lg">
              <div className="flex items-center gap-1.5 mb-2">
                <Target className="h-3.5 w-3.5 text-blue-400" />
                <p className="text-[9px] text-gray-500 uppercase font-bold">Position Size</p>
              </div>
              <p className="text-lg font-bold font-mono text-gray-200">
                {calculations.positionSize > 0
                  ? `${(calculations.positionSize / lotSize).toFixed(2)} lots`
                  : "—"}
              </p>
              <p className="text-[9px] text-gray-500 mt-1">
                {calculations.positionSize > 0
                  ? `${calculations.positionSize.toLocaleString(undefined, { maximumFractionDigits: 0 })} units`
                  : "Set entry & SL"}
              </p>
            </div>

            <div className="bg-gray-950 border border-gray-850 p-4 rounded-lg">
              <div className="flex items-center gap-1.5 mb-2">
                <Percent className="h-3.5 w-3.5 text-purple-400" />
                <p className="text-[9px] text-gray-500 uppercase font-bold">R:R Ratio</p>
              </div>
              <p className={`text-lg font-bold font-mono ${
                calculations.rrRatio >= 2 ? "text-green-400" : calculations.rrRatio >= 1 ? "text-orange-400" : "text-gray-400"
              }`}>
                {calculations.rrRatio > 0
                  ? `1:${calculations.rrRatio.toFixed(2)}`
                  : "—"}
              </p>
              <p className="text-[9px] text-gray-500 mt-1">
                {calculations.rrRatio >= 2 ? "Good R:R" : calculations.rrRatio >= 1 ? "Acceptable" : "Set TP"}
              </p>
            </div>
          </div>

          {/* Pips Info */}
          {calculations.valid && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900/40 border border-gray-900 p-3 rounded-lg flex justify-between items-center">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Pips at Risk</span>
                <span className="text-sm font-bold font-mono text-red-400">
                  {calculations.pipsAtRisk.toFixed(4)}
                </span>
              </div>
              <div className="bg-gray-900/40 border border-gray-900 p-3 rounded-lg flex justify-between items-center">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Pips to Target</span>
                <span className="text-sm font-bold font-mono text-green-400">
                  {calculations.pipsToTarget > 0 ? calculations.pipsToTarget.toFixed(4) : "—"}
                </span>
              </div>
            </div>
          )}

          {/* R:R Visual Bar */}
          {calculations.rrRatio > 0 && (
            <div className="bg-gray-900/40 border border-gray-900 p-4 rounded-lg space-y-2">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Risk/Reward Visual</p>
              <div className="flex items-center gap-1 h-6">
                <div
                  className="h-full bg-red-500/60 rounded-l border border-red-500/30 flex items-center justify-center text-[9px] font-bold text-red-300"
                  style={{ width: `${Math.min(50, (1 / (1 + calculations.rrRatio)) * 100)}%` }}
                >
                  1R
                </div>
                <div
                  className="h-full bg-green-500/60 rounded-r border border-green-500/30 flex items-center justify-center text-[9px] font-bold text-green-300"
                  style={{ width: `${Math.min(50, (calculations.rrRatio / (1 + calculations.rrRatio)) * 100)}%` }}
                >
                  {calculations.rrRatio.toFixed(1)}R
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
