"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TRADING_PAIRS } from "@/lib/constants";
import { ScreenshotUpload } from "./screenshot-upload";
import { Direction, TradeResult, TradingSession, ImageType } from "@prisma/client";
import { toast } from "sonner";
import { Info, Loader2, X } from "lucide-react";

interface StrategyVersionOption {
  id: string;
  version: number;
  strategy: {
    name: string;
    market: string;
  };
}

interface TradeFormProps {
  initialData?: any; // For editing
}

export const TradeForm: React.FC<TradeFormProps> = ({ initialData }) => {
  const router = useRouter();
  const isEdit = !!initialData;

  // Form Fields
  const [pair, setPair] = useState(initialData?.pair || TRADING_PAIRS[0]);
  const [date, setDate] = useState(
    initialData?.date
      ? new Date(initialData.date).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [sessionVal, setSessionVal] = useState<TradingSession>(
    initialData?.session || TradingSession.LONDON
  );
  const [direction, setDirection] = useState<Direction>(
    initialData?.direction || Direction.LONG
  );
  const [entryPrice, setEntryPrice] = useState<string>(
    initialData?.entryPrice?.toString() || ""
  );
  const [stopLoss, setStopLoss] = useState<string>(
    initialData?.stopLoss?.toString() || ""
  );
  const [takeProfit, setTakeProfit] = useState<string>(
    initialData?.takeProfit?.toString() || ""
  );
  const [riskPercent, setRiskPercent] = useState<string>(
    initialData?.riskPercent?.toString() || "1.0"
  );
  const [result, setResult] = useState<TradeResult | "PENDING">(
    initialData?.result || "PENDING"
  );
  const [pnl, setPnl] = useState<string>(
    initialData?.pnl?.toString() || ""
  );
  const [rrAchieved, setRrAchieved] = useState<string>(
    initialData?.rrAchieved?.toString() || ""
  );
  const [notes, setNotes] = useState<string>(initialData?.notes || "");
  const [strategyVersionId, setStrategyVersionId] = useState<string>(
    initialData?.strategyVersionId || ""
  );

  // Screenshot Upload state
  const [screenshots, setScreenshots] = useState<{ file: File; type: ImageType }[]>([]);
  const [deleteImageIds, setDeleteImageIds] = useState<string[]>([]);

  // Page States
  const [strategies, setStrategies] = useState<StrategyVersionOption[]>([]);
  const [loadingStrategies, setLoadingStrategies] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Computations
  const [plannedRR, setPlannedRR] = useState<number | null>(null);

  // Fetch Strategies
  useEffect(() => {
    async function fetchStrategies() {
      try {
        const res = await fetch("/api/strategies");
        if (res.ok) {
          const data = await res.json();
          // Extract the active versions of all strategies
          const options: StrategyVersionOption[] = [];
          data.forEach((strat: any) => {
            const activeVer = strat.versions.find((v: any) => v.isActive);
            if (activeVer) {
              options.push({
                id: activeVer.id,
                version: activeVer.version,
                strategy: {
                  name: strat.name,
                  market: strat.market,
                },
              });
            }
          });
          setStrategies(options);
          if (options.length > 0 && !strategyVersionId) {
            setStrategyVersionId(options[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch strategies:", err);
      } finally {
        setLoadingStrategies(false);
      }
    }

    fetchStrategies();
  }, [strategyVersionId]);

  // Compute Planned RR
  useEffect(() => {
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);

    if (!isNaN(entry) && !isNaN(sl) && !isNaN(tp) && entry > 0 && sl > 0 && tp > 0) {
      const risk = Math.abs(entry - sl);
      const target = Math.abs(tp - entry);
      if (risk > 0) {
        setPlannedRR(parseFloat((target / risk).toFixed(2)));
      } else {
        setPlannedRR(null);
      }
    } else {
      setPlannedRR(null);
    }
  }, [entryPrice, stopLoss, takeProfit]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!entryPrice || !stopLoss || !takeProfit || !riskPercent) {
      toast.error("Please fill in entry price, stop loss, take profit, and risk %.");
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading(isEdit ? "Updating trade..." : "Journaling trade...");

    try {
      const formData = new FormData();
      formData.append("pair", pair);
      formData.append("date", new Date(date).toISOString());
      formData.append("session", sessionVal);
      formData.append("direction", direction);
      formData.append("entryPrice", entryPrice);
      formData.append("stopLoss", stopLoss);
      formData.append("takeProfit", takeProfit);
      formData.append("riskPercent", riskPercent);
      
      if (result !== "PENDING") {
        formData.append("result", result);
      } else {
        formData.append("result", "");
      }
      
      formData.append("pnl", pnl);
      formData.append("rrAchieved", rrAchieved);
      formData.append("notes", notes);
      formData.append("strategyVersionId", strategyVersionId);

      // Append files
      screenshots.forEach((screen) => {
        formData.append(`images_${screen.type}`, screen.file);
      });

      if (isEdit && deleteImageIds.length > 0) {
        formData.append("deleteImageIds", JSON.stringify(deleteImageIds));
      }

      const url = isEdit ? `/api/trades/${initialData.id}` : "/api/trades";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "An error occurred");
      }

      toast.dismiss(loadingToast);
      toast.success(isEdit ? "Trade updated successfully" : "Trade journaled successfully");
      router.push("/journal");
      router.refresh();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "Failed to save trade");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Strategy & Core settings */}
        <div className="md:col-span-2 space-y-6 bg-gray-900/40 p-6 border border-gray-800 rounded-lg">
          <h3 className="text-base font-semibold text-gray-200">Execution Parameters</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Strategy Select */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Strategy
              </label>
              {loadingStrategies ? (
                <div className="h-10 bg-gray-950 border border-gray-800 rounded-md animate-pulse" />
              ) : strategies.length === 0 ? (
                <div className="text-xs text-amber-500 flex items-center gap-1.5 border border-amber-950/50 bg-amber-950/10 p-3 rounded-md">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>No active strategy found. Build a strategy to track checklist rules.</span>
                </div>
              ) : (
                <select
                  value={strategyVersionId}
                  onChange={(e) => setStrategyVersionId(e.target.value)}
                  className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-md text-sm text-gray-300 focus:outline-none focus:border-blue-500"
                >
                  {strategies.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.strategy.name} (v{opt.version}) — {opt.strategy.market}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Pair Select */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Trading Pair
              </label>
              <select
                value={pair}
                onChange={(e) => setPair(e.target.value)}
                className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-md text-sm text-gray-300 focus:outline-none focus:border-blue-500"
              >
                {TRADING_PAIRS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Execution Date & Time
              </label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-md text-sm text-gray-300 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Trading Session */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Session
              </label>
              <select
                value={sessionVal}
                onChange={(e) => setSessionVal(e.target.value as TradingSession)}
                className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-md text-sm text-gray-300 focus:outline-none focus:border-blue-500"
              >
                <option value={TradingSession.LONDON}>London</option>
                <option value={TradingSession.NEW_YORK}>New York</option>
                <option value={TradingSession.ASIAN}>Asian</option>
              </select>
            </div>
          </div>

          {/* Direction & Risk */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Direction LONG / SHORT */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                Direction
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection(Direction.LONG)}
                  className={`h-10 text-sm font-semibold rounded-md border transition ${
                    direction === Direction.LONG
                      ? "bg-blue-600/10 border-blue-500 text-blue-400"
                      : "bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700"
                  }`}
                >
                  Buy / Long
                </button>
                <button
                  type="button"
                  onClick={() => setDirection(Direction.SHORT)}
                  className={`h-10 text-sm font-semibold rounded-md border transition ${
                    direction === Direction.SHORT
                      ? "bg-red-600/10 border-red-500 text-red-400"
                      : "bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700"
                  }`}
                >
                  Sell / Short
                </button>
              </div>
            </div>

            {/* Risk Percent */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                Risk Percent (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  placeholder="1.0"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(e.target.value)}
                  className="w-full h-10 pl-3 pr-8 bg-gray-950 border border-gray-800 rounded-md text-sm text-gray-300 focus:outline-none focus:border-blue-500 font-mono"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-500 font-mono">
                  %
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Price entry & live math */}
        <div className="space-y-6 bg-gray-900/40 p-6 border border-gray-800 rounded-lg flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-200 mb-4">Price Levels</h3>
            <div className="space-y-4">
              {/* Entry Price */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Entry Price
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-md text-sm text-gray-300 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Stop Loss */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Stop Loss
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-md text-sm text-gray-300 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Take Profit */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Take Profit
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-md text-sm text-gray-300 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Planned Risk to Reward Display */}
          <div className="mt-4 pt-4 border-t border-gray-800/85">
            <div className="flex justify-between items-center bg-gray-950 border border-gray-800 p-3.5 rounded-md">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Planned RR Ratio
              </span>
              <span className="text-sm font-bold text-blue-500 font-mono">
                {plannedRR !== null ? `${plannedRR} R` : "-- R"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Outcome Section */}
      <div className="bg-gray-900/40 p-6 border border-gray-800 rounded-lg space-y-6">
        <h3 className="text-base font-semibold text-gray-200">Outcome & P&L (Optional for open trades)</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Result */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
              Result
            </label>
            <select
              value={result}
              onChange={(e) => setResult(e.target.value as any)}
              className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-md text-sm text-gray-300 focus:outline-none focus:border-blue-500"
            >
              <option value="PENDING">Pending / Open</option>
              <option value="WIN">Win</option>
              <option value="LOSS">Loss</option>
              <option value="BREAKEVEN">Breakeven</option>
            </select>
          </div>

          {/* PNL in currency */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Profit / Loss ($)
            </label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={pnl}
              disabled={result === "PENDING"}
              onChange={(e) => setPnl(e.target.value)}
              className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-md text-sm text-gray-300 focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed font-mono"
            />
          </div>

          {/* RR Achieved */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              RR Achieved
            </label>
            <input
              type="number"
              step="any"
              placeholder={plannedRR !== null ? `${plannedRR}` : "0.00"}
              value={rrAchieved}
              disabled={result === "PENDING"}
              onChange={(e) => setRrAchieved(e.target.value)}
              className="w-full h-10 px-3 bg-gray-950 border border-gray-800 rounded-md text-sm text-gray-300 focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed font-mono"
            />
          </div>
        </div>
      </div>

      {/* Screenshots Section */}
      <div className="bg-gray-900/40 p-6 border border-gray-800 rounded-lg">
        <ScreenshotUpload onFilesChange={setScreenshots} />

        {isEdit && initialData.images?.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-800">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Saved Screenshots</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {initialData.images.map((img: any) => {
                const isDeleted = deleteImageIds.includes(img.id);
                return (
                  <div
                    key={img.id}
                    className={`relative border border-gray-800 bg-gray-950 rounded-md p-2 flex flex-col space-y-2 transition ${
                      isDeleted ? "opacity-30 line-through" : ""
                    }`}
                  >
                    <div className="relative aspect-video w-full rounded overflow-hidden bg-gray-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt="Screenshot"
                        className="object-cover w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (isDeleted) {
                            setDeleteImageIds(deleteImageIds.filter((id) => id !== img.id));
                          } else {
                            setDeleteImageIds([...deleteImageIds, img.id]);
                          }
                        }}
                        className={`absolute top-1 right-1 p-1 rounded-full transition ${
                          isDeleted ? "bg-green-600" : "bg-red-600/80 hover:bg-red-600"
                        } text-white`}
                      >
                        {isDeleted ? <span className="text-xs px-1">Restore</span> : <X className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono uppercase">
                      {img.type.replace(/_/g, " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Notes Section */}
      <div className="bg-gray-900/40 p-6 border border-gray-800 rounded-lg space-y-2">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Trade Notes & Thoughts
        </label>
        <textarea
          rows={5}
          placeholder="Describe why you took this setup, what confluences were checked, state of mind during execution, exit management..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-3 bg-gray-950 border border-gray-800 rounded-md text-sm text-gray-300 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.push("/journal")}
          className="px-5 h-11 border border-gray-800 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-900 transition"
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
            <span>{isEdit ? "Update Trade" : "Save Trade Journal"}</span>
          )}
        </button>
      </div>
    </form>
  );
};
