"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Copy, RotateCcw, Check, ChevronDown, Layers } from "lucide-react";

interface InstrumentPreset {
  label: string;
  symbol: string;
  pipSize: number;
  pipValue: number;
  contractSize: number;
  category: "forex" | "gold" | "index" | "crypto" | "custom";
}

const INSTRUMENT_PRESETS: InstrumentPreset[] = [
  { label: "XAUUSD", symbol: "XAUUSD", pipSize: 0.01, pipValue: 1.0, contractSize: 100, category: "gold" },
  { label: "EURUSD", symbol: "EURUSD", pipSize: 0.0001, pipValue: 10.0, contractSize: 100000, category: "forex" },
  { label: "GBPUSD", symbol: "GBPUSD", pipSize: 0.0001, pipValue: 10.0, contractSize: 100000, category: "forex" },
  { label: "USDJPY", symbol: "USDJPY", pipSize: 0.01, pipValue: 10.0, contractSize: 100000, category: "forex" },
  { label: "NAS100", symbol: "NAS100", pipSize: 1.0, pipValue: 1.0, contractSize: 1, category: "index" },
  { label: "US30", symbol: "US30", pipSize: 1.0, pipValue: 1.0, contractSize: 1, category: "index" },
  { label: "BTCUSD", symbol: "BTCUSD", pipSize: 1.0, pipValue: 1.0, contractSize: 1, category: "crypto" },
  { label: "Custom", symbol: "CUSTOM", pipSize: 0.0001, pipValue: 10.0, contractSize: 100000, category: "custom" },
];

const QUICK_RISKS = [0.25, 0.5, 1, 2];

const CATEGORY_COLORS: Record<string, string> = {
  gold: "text-yellow-400",
  forex: "text-blue-400",
  index: "text-purple-400",
  crypto: "text-orange-400",
  custom: "text-gray-400",
};

interface LotSizeCalculatorProps {
  accountBalance: number;
  currency?: string;
}

export function LotSizeCalculator({ accountBalance, currency = "USD" }: LotSizeCalculatorProps) {
  const [balance, setBalance] = useState(accountBalance);
  const [riskPercent, setRiskPercent] = useState(1);
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [customPipSize, setCustomPipSize] = useState(0.0001);
  const [customPipValue, setCustomPipValue] = useState(10);
  const [customContractSize, setCustomContractSize] = useState(100000);
  const [copied, setCopied] = useState(false);
  const [resultKey, setResultKey] = useState(0);

  const symbol = currency === "INR" ? "₹" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";

  useEffect(() => { setBalance(accountBalance); }, [accountBalance]);

  const preset = INSTRUMENT_PRESETS[selectedPresetIdx];
  const isCustom = preset.category === "custom";
  const pipSize = isCustom ? customPipSize : preset.pipSize;
  const pipValue = isCustom ? customPipValue : preset.pipValue;
  const contractSize = isCustom ? customContractSize : preset.contractSize;

  const calc = useMemo(() => {
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLossPrice);
    const riskAmount = (balance * riskPercent) / 100;

    if (isNaN(entry) || isNaN(sl) || entry === sl || pipSize <= 0 || pipValue <= 0) {
      return { riskAmount, stopDistance: 0, stopPips: 0, lotSize: 0, positionValue: 0, marginEstimate: 0, valid: false };
    }

    const stopDistance = Math.abs(entry - sl);
    const stopPips = stopDistance / pipSize;
    const lotSize = stopPips > 0 ? riskAmount / (stopPips * pipValue) : 0;
    const positionValue = lotSize * contractSize * entry;
    const marginEstimate = positionValue / 100;

    return { riskAmount, stopDistance, stopPips, lotSize, positionValue, marginEstimate, valid: true };
  }, [balance, riskPercent, entryPrice, stopLossPrice, pipSize, pipValue, contractSize]);

  // Trigger result animation on change
  useEffect(() => { setResultKey((k) => k + 1); }, [calc.lotSize, calc.riskAmount]);

  const handleCopy = useCallback(() => {
    const unit = preset.category === "forex" || preset.category === "gold" ? "pips" : "pts";
    const text = `Risk: ${symbol}${calc.riskAmount.toFixed(2)} | Lot Size: ${calc.lotSize.toFixed(2)} | SL: ${calc.stopPips.toFixed(1)} ${unit} | Pair: ${preset.label}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [calc, preset, symbol]);

  const handleReset = useCallback(() => {
    setBalance(accountBalance);
    setRiskPercent(1);
    setEntryPrice("");
    setStopLossPrice("");
    setSelectedPresetIdx(0);
  }, [accountBalance]);

  const fmt = (n: number, d = 2) => n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="space-y-5">
      {/* Inputs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column - Core Inputs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-800/60">
            <Layers className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-200">Lot Size Calculator</h3>
          </div>

          {/* Account Balance */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Account Balance</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold">{symbol}</span>
              <input type="number" value={balance} onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                className="calc-input w-full h-11 pl-7 pr-3 rounded-xl text-sm text-gray-200 font-mono font-bold" />
            </div>
          </div>

          {/* Risk % + Quick Buttons */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Risk Percentage</label>
            <input type="number" step="0.1" min="0.1" max="100" value={riskPercent}
              onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
              className="calc-input w-full h-11 px-3 rounded-xl text-sm text-gray-200 font-mono font-bold" />
            <div className="flex gap-2">
              {QUICK_RISKS.map((r) => (
                <button key={r} onClick={() => setRiskPercent(r)}
                  className={`quick-risk-btn flex-1 py-2 rounded-lg text-xs font-bold ${riskPercent === r ? "active" : ""}`}>
                  {r}%
                </button>
              ))}
            </div>
          </div>

          {/* Entry & Stop Loss */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Entry Price</label>
              <input type="number" step="any" placeholder="0.00" value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="calc-input w-full h-11 px-3 rounded-xl text-sm text-gray-200 font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-red-400/70 uppercase tracking-wider">Stop Loss</label>
              <input type="number" step="any" placeholder="0.00" value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
                className="calc-input w-full h-11 px-3 rounded-xl text-sm text-gray-200 font-mono" style={{ borderColor: "rgba(239,68,68,0.15)" }} />
            </div>
          </div>

          {/* Instrument Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Instrument / Pair</label>
            <div className="grid grid-cols-4 gap-1.5">
              {INSTRUMENT_PRESETS.map((p, i) => (
                <button key={p.symbol} onClick={() => setSelectedPresetIdx(i)}
                  className={`py-2 px-1 rounded-lg text-[10px] font-bold transition-all duration-200 border ${
                    selectedPresetIdx === i
                      ? "bg-blue-500/15 border-blue-500/40 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]"
                      : "bg-gray-900/40 border-gray-800/50 text-gray-500 hover:text-gray-300 hover:border-gray-700"
                  }`}>
                  <span className={selectedPresetIdx === i ? CATEGORY_COLORS[p.category] : ""}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Fields */}
          <AnimatePresence>
            {isCustom && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Pip Size</label>
                    <input type="number" step="any" value={customPipSize} onChange={(e) => setCustomPipSize(parseFloat(e.target.value) || 0.0001)}
                      className="calc-input w-full h-9 px-2 rounded-lg text-xs text-gray-300 font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Pip Value</label>
                    <input type="number" step="any" value={customPipValue} onChange={(e) => setCustomPipValue(parseFloat(e.target.value) || 1)}
                      className="calc-input w-full h-9 px-2 rounded-lg text-xs text-gray-300 font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Contract</label>
                    <input type="number" step="any" value={customContractSize} onChange={(e) => setCustomContractSize(parseFloat(e.target.value) || 1)}
                      className="calc-input w-full h-9 px-2 rounded-lg text-xs text-gray-300 font-mono" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preset Info Bar */}
          {!isCustom && (
            <div className="flex items-center gap-3 text-[9px] text-gray-500 bg-gray-900/30 rounded-lg px-3 py-2 border border-gray-800/40">
              <span>Pip: <strong className="text-gray-400">{pipSize}</strong></span>
              <span className="text-gray-700">|</span>
              <span>Value: <strong className="text-gray-400">{symbol}{pipValue}</strong></span>
              <span className="text-gray-700">|</span>
              <span>Contract: <strong className="text-gray-400">{contractSize.toLocaleString()}</strong></span>
            </div>
          )}
        </div>

        {/* Right Column - Results */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800/60">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-gray-200">Results</h3>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleCopy} disabled={!calc.valid}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 disabled:opacity-30 disabled:cursor-not-allowed">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button onClick={handleReset}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 bg-gray-800/40 border border-gray-700/40 text-gray-400 hover:text-gray-200 hover:bg-gray-800/60">
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Primary Result - Lot Size */}
          <motion.div key={`lot-${resultKey}`} initial={{ scale: 0.97, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}
            className="result-card-glow rounded-2xl p-5 text-center">
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Recommended Lot Size</p>
            <p className="text-4xl font-black font-mono text-blue-400 tracking-tight">
              {calc.valid ? calc.lotSize.toFixed(2) : "—"}
            </p>
            <p className="text-[10px] text-gray-500 mt-1.5">{calc.valid ? `${preset.label} Standard Lots` : "Enter prices to calculate"}</p>
          </motion.div>

          {/* Result Grid */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div key={`risk-${resultKey}`} initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}
              className="result-card-glow rounded-xl p-4">
              <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Risk Amount</p>
              <p className="text-lg font-bold font-mono text-red-400">{symbol}{fmt(calc.riskAmount)}</p>
              <p className="text-[9px] text-gray-600 mt-0.5">{riskPercent}% of balance</p>
            </motion.div>

            <motion.div key={`dist-${resultKey}`} initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
              className="result-card-glow rounded-xl p-4">
              <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Stop Distance</p>
              <p className="text-lg font-bold font-mono text-orange-400">
                {calc.valid ? `${calc.stopPips.toFixed(1)} ${preset.category === "forex" || preset.category === "gold" ? "pips" : "pts"}` : "—"}
              </p>
              <p className="text-[9px] text-gray-600 mt-0.5">{calc.valid ? `${calc.stopDistance.toFixed(pipSize < 0.01 ? 5 : 2)} price` : "—"}</p>
            </motion.div>

            <motion.div key={`pos-${resultKey}`} initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
              className="result-card-glow rounded-xl p-4">
              <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Position Value</p>
              <p className="text-lg font-bold font-mono text-gray-200">
                {calc.valid ? `${symbol}${calc.positionValue >= 1000000 ? `${(calc.positionValue / 1000000).toFixed(2)}M` : fmt(calc.positionValue)}` : "—"}
              </p>
            </motion.div>

            <motion.div key={`margin-${resultKey}`} initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
              className="result-card-glow rounded-xl p-4">
              <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Margin Est. (1:100)</p>
              <p className="text-lg font-bold font-mono text-purple-400">
                {calc.valid ? `${symbol}${fmt(calc.marginEstimate)}` : "—"}
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
