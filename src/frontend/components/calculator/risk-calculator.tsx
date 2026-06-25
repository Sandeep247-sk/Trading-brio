"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Calculator, DollarSign, TrendingUp, Percent, Target,
  AlertTriangle, Info, Shield, ArrowLeftRight
} from "lucide-react";
import { LotSizeCalculator } from "./lot-size-calculator";

interface RiskCalculatorProps {
  accountBalance?: number;
  currency?: string;
  maxRiskPerTrade?: number | null;
}

export function RiskCalculator({ accountBalance = 10000, currency = "USD", maxRiskPerTrade }: RiskCalculatorProps) {
  const [activeTab, setActiveTab] = useState<"risk" | "lot">("risk");
  const [isFlipped, setIsFlipped] = useState(false);

  // === Front Face State (Risk Calculator) ===
  const [balance, setBalance] = useState(accountBalance);
  const [riskPercent, setRiskPercent] = useState(maxRiskPerTrade ? Number(maxRiskPerTrade) : 1);
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [instrumentType, setInstrumentType] = useState<"forex" | "gold_jpy" | "crypto_indices">("forex");
  const [lotSize, setLotSize] = useState(100000);
  const [pipValue, setPipValue] = useState(10);

  useEffect(() => { setBalance(accountBalance); }, [accountBalance]);

  useEffect(() => {
    if (instrumentType === "forex") { setLotSize(100000); setPipValue(10); }
    else if (instrumentType === "gold_jpy") { setLotSize(100000); setPipValue(1.0); }
    else { setLotSize(1); setPipValue(1.0); }
  }, [instrumentType]);

  const handleTabSwitch = (tab: "risk" | "lot") => {
    setActiveTab(tab);
    setIsFlipped(tab === "lot");
  };

  const calculations = useMemo(() => {
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);
    const riskAmount = (balance * riskPercent) / 100;

    if (isNaN(entry) || isNaN(sl) || entry === sl) {
      return { riskAmount, rewardAmount: 0, positionSize: 0, rrRatio: 0, pipsAtRisk: 0, pipsToTarget: 0, direction: "N/A" as const, valid: false };
    }

    const isLong = entry > sl;
    const direction = isLong ? "LONG" : "SHORT";
    const pipSize = instrumentType === "forex" ? 0.0001 : instrumentType === "gold_jpy" ? 0.01 : 1.0;
    const pipsAtRisk = Math.abs(entry - sl) / pipSize;
    const pipsToTarget = !isNaN(tp) && tp !== 0 ? Math.abs(tp - entry) / pipSize : 0;
    const positionSizeLots = pipsAtRisk > 0 ? riskAmount / (pipsAtRisk * pipValue) : 0;
    const positionSize = positionSizeLots * lotSize;
    const rrRatio = pipsAtRisk > 0 && pipsToTarget > 0 ? pipsToTarget / pipsAtRisk : 0;
    const rewardAmount = riskAmount * rrRatio;

    return { riskAmount, rewardAmount, positionSize, rrRatio, pipsAtRisk, pipsToTarget, direction, valid: true };
  }, [balance, riskPercent, entryPrice, stopLoss, takeProfit, lotSize, pipValue, instrumentType]);

  const symbol = currency === "INR" ? "₹" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  const isRiskExceeded = maxRiskPerTrade && riskPercent > Number(maxRiskPerTrade);

  return (
    <div className="space-y-5">
      {/* === Segmented Toggle === */}
      <div className="flex justify-center">
        <div className="relative flex items-center bg-[#050B18]/80 rounded-2xl p-1 border border-gray-800/50 backdrop-blur-sm">
          {/* Sliding Indicator */}
          <motion.div
            className="absolute h-[calc(100%-8px)] rounded-xl bg-blue-500/15 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
            animate={{ x: activeTab === "risk" ? 4 : "calc(100% + 4px)", width: "calc(50% - 8px)" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            style={{ top: 4, left: 0 }}
          />
          <button onClick={() => handleTabSwitch("risk")}
            className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-colors duration-200 ${
              activeTab === "risk" ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
            }`}>
            <Calculator className="h-3.5 w-3.5" />
            Risk Calculator
          </button>
          <button onClick={() => handleTabSwitch("lot")}
            className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-colors duration-200 ${
              activeTab === "lot" ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
            }`}>
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Lot Size Calculator
          </button>
        </div>
      </div>

      {/* === 3D Flip Card === */}
      <div className="flip-card-perspective">
        <div className={`flip-card-inner ${isFlipped ? "flipped" : ""}`}>
          {/* ======= FRONT FACE - Risk Calculator ======= */}
          <div className="flip-card-face glass-card-premium rounded-3xl p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Inputs */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-800/60 pb-3">
                  <Calculator className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-gray-200">Position Calculator</h3>
                </div>

                {/* Account Balance */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Account Balance ({currency})</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold">{symbol}</span>
                    <input type="number" value={balance} onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                      className="calc-input w-full h-11 pl-7 pr-3 rounded-xl text-sm text-gray-200 font-mono font-bold" />
                  </div>
                </div>

                {/* Instrument Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Instrument Type</label>
                  <select value={instrumentType} onChange={(e) => setInstrumentType(e.target.value as typeof instrumentType)}
                    className="calc-input w-full h-11 px-3 rounded-xl text-sm text-gray-300 font-medium appearance-none cursor-pointer">
                    <option value="forex">Forex (0.0001 Pip Size)</option>
                    <option value="gold_jpy">Gold / JPY Pairs (0.01 Pip Size)</option>
                    <option value="crypto_indices">Crypto / Indices (1.00 Point Size)</option>
                  </select>
                </div>

                {/* Risk Percent */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Risk Per Trade (%)</label>
                    {maxRiskPerTrade && (
                      <span className="text-[9px] text-gray-600 font-mono">Max: {Number(maxRiskPerTrade)}%</span>
                    )}
                  </div>
                  <input type="number" step="0.1" min="0.1" max="100" value={riskPercent}
                    onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                    className={`calc-input w-full h-11 px-3 rounded-xl text-sm text-gray-200 font-mono font-bold ${
                      isRiskExceeded ? "!border-red-500/40" : ""
                    }`} />
                  {isRiskExceeded && (
                    <div className="flex items-center gap-1 text-[10px] text-red-400">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Exceeds max risk limit of {Number(maxRiskPerTrade)}%</span>
                    </div>
                  )}
                </div>

                {/* Price Inputs */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Entry</label>
                    <input type="number" step="any" placeholder="2350.50" value={entryPrice}
                      onChange={(e) => setEntryPrice(e.target.value)}
                      className="calc-input w-full h-11 px-3 rounded-xl text-xs text-gray-200 font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-red-400/70 uppercase tracking-wider">Stop Loss</label>
                    <input type="number" step="any" placeholder="2345.00" value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      className="calc-input w-full h-11 px-3 rounded-xl text-xs text-gray-200 font-mono" style={{ borderColor: "rgba(239,68,68,0.15)" }} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-green-400/70 uppercase tracking-wider">Take Profit</label>
                    <input type="number" step="any" placeholder="2365.00" value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      className="calc-input w-full h-11 px-3 rounded-xl text-xs text-gray-200 font-mono" style={{ borderColor: "rgba(34,197,94,0.15)" }} />
                  </div>
                </div>

                {/* Contract / Pip Settings */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      Lot Size (Units) <Info className="h-3 w-3 text-gray-700" />
                    </label>
                    <select value={lotSize} onChange={(e) => setLotSize(parseInt(e.target.value))}
                      className="calc-input w-full h-11 px-3 rounded-xl text-xs text-gray-300 appearance-none cursor-pointer">
                      <option value={100000}>Standard (100,000)</option>
                      <option value={10000}>Mini (10,000)</option>
                      <option value={1000}>Micro (1,000)</option>
                      <option value={100}>Nano (100)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pip Value ({symbol}/pip)</label>
                    <input type="number" step="0.01" value={pipValue}
                      onChange={(e) => setPipValue(parseFloat(e.target.value) || 0)}
                      className="calc-input w-full h-11 px-3 rounded-xl text-xs text-gray-200 font-mono" />
                  </div>
                </div>
              </div>

              {/* Results Panel */}
              <div className="space-y-4">
                {/* Direction Badge */}
                {calculations.valid && (
                  <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl border text-sm font-bold ${
                      calculations.direction === "LONG"
                        ? "bg-green-500/5 border-green-500/25 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.05)]"
                        : "bg-red-500/5 border-red-500/25 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.05)]"
                    }`}>
                    <Shield className="h-4 w-4" />
                    {calculations.direction} Position
                  </motion.div>
                )}

                {/* Result Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="result-card-glow rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <DollarSign className="h-3.5 w-3.5 text-red-400" />
                      <p className="text-[9px] text-gray-500 uppercase font-bold">Risk Amount</p>
                    </div>
                    <p className="text-xl font-bold font-mono text-red-400">
                      {symbol}{calculations.riskAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] text-gray-600 mt-1">{riskPercent}% of {symbol}{balance.toLocaleString()}</p>
                  </div>

                  <div className="result-card-glow rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                      <p className="text-[9px] text-gray-500 uppercase font-bold">Expected Reward</p>
                    </div>
                    <p className="text-xl font-bold font-mono text-green-400">
                      {calculations.rewardAmount > 0
                        ? `${symbol}${calculations.rewardAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </p>
                    <p className="text-[9px] text-gray-600 mt-1">
                      {calculations.rrRatio > 0 ? `${calculations.rrRatio.toFixed(2)}x risk` : "Set TP"}
                    </p>
                  </div>

                  <div className="result-card-glow rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Target className="h-3.5 w-3.5 text-blue-400" />
                      <p className="text-[9px] text-gray-500 uppercase font-bold">Position Size</p>
                    </div>
                    <p className="text-xl font-bold font-mono text-gray-100">
                      {calculations.positionSize > 0 ? `${(calculations.positionSize / lotSize).toFixed(2)} lots` : "—"}
                    </p>
                    <p className="text-[9px] text-gray-600 mt-1">
                      {calculations.positionSize > 0
                        ? `${calculations.positionSize.toLocaleString(undefined, { maximumFractionDigits: 0 })} units`
                        : "Set entry & SL"}
                    </p>
                  </div>

                  <div className="result-card-glow rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Percent className="h-3.5 w-3.5 text-purple-400" />
                      <p className="text-[9px] text-gray-500 uppercase font-bold">R:R Ratio</p>
                    </div>
                    <p className={`text-xl font-bold font-mono ${
                      calculations.rrRatio >= 2 ? "text-green-400" : calculations.rrRatio >= 1 ? "text-orange-400" : "text-gray-500"
                    }`}>
                      {calculations.rrRatio > 0 ? `1:${calculations.rrRatio.toFixed(2)}` : "—"}
                    </p>
                    <p className="text-[9px] text-gray-600 mt-1">
                      {calculations.rrRatio >= 2 ? "Good R:R" : calculations.rrRatio >= 1 ? "Acceptable" : "Set TP"}
                    </p>
                  </div>
                </div>

                {/* Pips Info */}
                {calculations.valid && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="result-card-glow rounded-xl p-3 flex justify-between items-center">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Pips at Risk</span>
                      <span className="text-sm font-bold font-mono text-red-400">{calculations.pipsAtRisk.toFixed(4)}</span>
                    </div>
                    <div className="result-card-glow rounded-xl p-3 flex justify-between items-center">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Pips to Target</span>
                      <span className="text-sm font-bold font-mono text-green-400">
                        {calculations.pipsToTarget > 0 ? calculations.pipsToTarget.toFixed(4) : "—"}
                      </span>
                    </div>
                  </div>
                )}

                {/* R:R Visual Bar */}
                {calculations.rrRatio > 0 && (
                  <div className="result-card-glow rounded-xl p-4 space-y-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Risk/Reward Visual</p>
                    <div className="flex items-center gap-1 h-7 overflow-hidden rounded-lg">
                      <div className="h-full bg-red-500/50 rounded-l-lg border border-red-500/25 flex items-center justify-center text-[9px] font-bold text-red-300 transition-all duration-500"
                        style={{ width: `${Math.min(50, (1 / (1 + calculations.rrRatio)) * 100)}%` }}>1R</div>
                      <div className="h-full bg-green-500/50 rounded-r-lg border border-green-500/25 flex items-center justify-center text-[9px] font-bold text-green-300 transition-all duration-500"
                        style={{ width: `${Math.min(50, (calculations.rrRatio / (1 + calculations.rrRatio)) * 100)}%` }}>{calculations.rrRatio.toFixed(1)}R</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ======= BACK FACE - Lot Size Calculator ======= */}
          <div className="flip-card-face flip-card-back glass-card-premium rounded-3xl p-6 sm:p-8">
            <LotSizeCalculator accountBalance={accountBalance} currency={currency} />
          </div>
        </div>
      </div>
    </div>
  );
}
