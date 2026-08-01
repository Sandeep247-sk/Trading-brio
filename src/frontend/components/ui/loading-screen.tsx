"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, RefreshCw, X, ShieldAlert, Sparkles, TrendingUp, Cpu } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
  subtitle?: string;
  showTimer?: boolean;
  onDismiss?: () => void;
  fullScreen?: boolean;
  elapsedSeconds?: number;
}

const TRADING_TIPS = [
  "Risk Management First: Never risk more than 1-2% of your total account equity on a single trade.",
  "Journaling Discipline: Track every trade, setup, and emotion to unlock your statistical edge.",
  "Patience is Key: Wait for price to come to your key levels. Great trades require patience.",
  "Follow the Rules: Strategy adherence consistently beats intuition in long-term performance.",
  "Master Position Sizing: Control your risk through position size, not tight stop losses alone.",
  "Protect Capital: Your primary job as a trader is risk control, profit is the reward.",
];

export function LoadingScreen({
  message = "Loading Trade OS",
  subtitle = "Optimizing your trading workspace & syncing live analytics...",
  showTimer = false,
  onDismiss,
  fullScreen = true,
  elapsedSeconds = 0,
}: LoadingScreenProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [seconds, setSeconds] = useState(elapsedSeconds);
  const [showDismissOption, setShowDismissOption] = useState(false);

  // Timer counter
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setSeconds((prev) => {
        const nextSec = Math.floor((prev + 0.1) * 10) / 10;
        if (nextSec >= 4.5) {
          setShowDismissOption(true);
        }
        return nextSec;
      });
    }, 100);

    return () => clearInterval(timerInterval);
  }, []);

  // Tip rotation
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % TRADING_TIPS.length);
    }, 4500);
    return () => clearInterval(tipInterval);
  }, []);

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative flex flex-col items-center justify-center p-8 max-w-md w-full text-center z-10"
    >
      {/* Glow aura */}
      <div className="absolute -inset-10 bg-gradient-to-r from-blue-600/20 via-indigo-500/20 to-purple-600/20 rounded-full blur-3xl opacity-70 animate-pulse pointer-events-none" />

      {/* Main Logo & Animated Pulse Spinner */}
      <div className="relative mb-8">
        {/* Outer rotating neon border */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent p-1 shadow-2xl shadow-blue-500/20 backdrop-blur-xl"
        />

        {/* Pulsing ring 1 */}
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-2xl border-2 border-blue-400/40"
        />

        {/* Pulsing ring 2 */}
        <motion.div
          animate={{ scale: [1, 1.45, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          className="absolute inset-0 rounded-2xl border border-indigo-400/30"
        />

        {/* Center Logo Icon / Image */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-xl overflow-hidden border border-blue-400/30 shadow-inner bg-card flex items-center justify-center">
            <img src="/logo.jpg" alt="Trade OS Logo" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Floating badge */}
        <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white rounded-full p-1.5 shadow-lg border border-blue-400/40 animate-bounce">
          <Cpu className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Title & Subtitle */}
      <div className="space-y-2 mb-6">
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
          <span>{message}</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Live OS
          </span>
        </h2>
        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Progress Bar & Status */}
      <div className="w-full space-y-2 mb-6">
        <div className="h-1.5 w-full bg-sidebar-accent/80 border border-border/50 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: ["15%", "45%", "75%", "92%"] }}
            transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.6)]"
          />
        </div>

        <div className="flex items-center justify-center text-[11px] text-muted-foreground font-mono-numbers px-1">
          <span className="flex items-center gap-1.5 text-blue-400/90 font-medium">
            <Loader2 className="h-3 w-3 animate-spin" />
            Taking a few seconds...
          </span>
        </div>
      </div>

      {/* Rotating Trading Pro-Tip Banner */}
      <div className="w-full bg-card/60 backdrop-blur-md border border-border/60 rounded-xl p-3.5 text-left relative overflow-hidden shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Trading Discipline Tip</span>
          </div>
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/50" />
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={currentTipIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-[11px] text-foreground/80 leading-relaxed italic"
          >
            "{TRADING_TIPS[currentTipIndex]}"
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Optional Timeout / Stalled Dismiss Action */}
      {showDismissOption && onDismiss && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 pt-4 border-t border-border/40 w-full flex flex-col sm:flex-row items-center justify-center gap-2 text-xs"
        >
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            Loading taking longer than expected?
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground text-[11px] font-medium transition flex items-center gap-1 border border-border"
            >
              <RefreshCw className="h-3 w-3" /> Reload
            </button>
            <button
              onClick={onDismiss}
              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition flex items-center gap-1 shadow-sm"
            >
              <X className="h-3 w-3" /> Dismiss Screen
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );

  if (!fullScreen) {
    return (
      <div className="w-full py-16 flex items-center justify-center bg-background/50 border border-border/40 rounded-2xl backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-xl border border-border/20 transition-all duration-300">
      {/* Background Subtle Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />
      {content}
    </div>
  );
}
