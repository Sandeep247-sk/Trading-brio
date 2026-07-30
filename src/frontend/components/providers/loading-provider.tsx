"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { AnimatePresence } from "framer-motion";

interface LoadingContextType {
  enabled: boolean;
  thresholdSeconds: number;
  isLoading: boolean;
  loadingMessage: string;
  loadingSubtitle: string;
  setEnabled: (enabled: boolean) => void;
  setThresholdSeconds: (seconds: number) => void;
  startLoading: (message?: string, subtitle?: string) => void;
  stopLoading: () => void;
  triggerTestLoading: (durationMs?: number, message?: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

const STORAGE_KEY = "trader_brio_loading_prefs_v1";

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Config state
  const [enabled, setEnabledState] = useState<boolean>(true);
  const [thresholdSeconds, setThresholdSecondsState] = useState<number>(1.5);

  // Active Loading state
  const [isLoadingVisible, setIsLoadingVisible] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("Loading Trader Brio");
  const [loadingSubtitle, setLoadingSubtitle] = useState<string>(
    "Optimizing your trading workspace & syncing live analytics..."
  );

  // Refs for tracking navigation and timers
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevRouteRef = useRef<string>("");
  const isPendingNavigation = useRef<boolean>(false);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.enabled === "boolean") setEnabledState(parsed.enabled);
        if (typeof parsed.thresholdSeconds === "number") setThresholdSecondsState(parsed.thresholdSeconds);
      }
    } catch {
      // fallback to defaults
    }
  }, []);

  const setEnabled = (val: boolean) => {
    setEnabledState(val);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const prev = saved ? JSON.parse(saved) : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, enabled: val }));
    } catch {}
  };

  const setThresholdSeconds = (sec: number) => {
    setThresholdSecondsState(sec);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const prev = saved ? JSON.parse(saved) : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, thresholdSeconds: sec }));
    } catch {}
  };

  // Helper to clear timer
  const clearLoadingTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Stop loading immediately
  const stopLoading = useCallback(() => {
    clearLoadingTimer();
    isPendingNavigation.current = false;
    setIsLoadingVisible(false);
  }, [clearLoadingTimer]);

  // Start loading after threshold
  const scheduleDelayedLoading = useCallback(
    (msg = "Loading Trader Brio", sub = "Taking a few seconds to process...") => {
      if (!enabled) return;
      clearLoadingTimer();
      setLoadingMessage(msg);
      setLoadingSubtitle(sub);
      isPendingNavigation.current = true;

      // Start timer for thresholdSeconds
      timerRef.current = setTimeout(() => {
        if (isPendingNavigation.current) {
          setIsLoadingVisible(true);
        }
      }, thresholdSeconds * 1000);
    },
    [enabled, thresholdSeconds, clearLoadingTimer]
  );

  // Start loading immediately
  const startLoading = useCallback(
    (msg = "Loading Trader Brio", sub = "Processing your request...") => {
      clearLoadingTimer();
      setLoadingMessage(msg);
      setLoadingSubtitle(sub);
      setIsLoadingVisible(true);
    },
    [clearLoadingTimer]
  );

  // Trigger test loading for preview/demo
  const triggerTestLoading = useCallback(
    (durationMs = 3000, msg = "Testing Loading Screen") => {
      startLoading(msg, `Simulating a ${durationMs / 1000}s slow network load...`);
      setTimeout(() => {
        stopLoading();
      }, durationMs);
    },
    [startLoading, stopLoading]
  );

  // Track route changes: when pathname or searchParams change, navigation completed
  useEffect(() => {
    const currentRoute = `${pathname}?${searchParams.toString()}`;
    if (prevRouteRef.current && prevRouteRef.current !== currentRoute) {
      // Navigation finished!
      stopLoading();
    }
    prevRouteRef.current = currentRoute;
  }, [pathname, searchParams, stopLoading]);

  // Listen to global anchor click events to trigger delayed loading if navigation takes > threshold
  useEffect(() => {
    if (!enabled) return;

    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || target.getAttribute("target") === "_blank") {
        return;
      }

      // Check if navigating to another page in app
      if (href.startsWith("/") && href !== pathname) {
        scheduleDelayedLoading(
          `Navigating to ${getRouteName(href)}`,
          "Page rendering is taking a few seconds..."
        );
      }
    };

    document.addEventListener("click", handleAnchorClick, true);
    return () => {
      document.removeEventListener("click", handleAnchorClick, true);
    };
  }, [enabled, pathname, scheduleDelayedLoading]);

  return (
    <LoadingContext.Provider
      value={{
        enabled,
        thresholdSeconds,
        isLoading: isLoadingVisible,
        loadingMessage,
        loadingSubtitle,
        setEnabled,
        setThresholdSeconds,
        startLoading,
        stopLoading,
        triggerTestLoading,
      }}
    >
      {children}
      <AnimatePresence>
        {isLoadingVisible && (
          <LoadingScreen
            message={loadingMessage}
            subtitle={loadingSubtitle}
            showTimer={true}
            onDismiss={stopLoading}
            fullScreen={true}
          />
        )}
      </AnimatePresence>
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}

function getRouteName(path: string): string {
  if (path.includes("/journal")) return "Trade Journal";
  if (path.includes("/calendar")) return "Trading Calendar";
  if (path.includes("/strategy")) return "Strategy Adherence";
  if (path.includes("/risk-calculator")) return "Risk Calculator";
  if (path.includes("/analytics")) return "Performance Analytics";
  if (path.includes("/coaching")) return "AI Coaching";
  if (path.includes("/settings")) return "Settings";
  if (path.includes("/dashboard")) return "Dashboard";
  return "Trader Brio";
}
