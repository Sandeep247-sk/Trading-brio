// ============================================================
// Trading Pairs
// ============================================================
export const TRADING_PAIRS = [
  "XAUUSD",
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCAD",
  "NZDUSD",
  "USDCHF",
  "GBPJPY",
  "EURJPY",
  "EURGBP",
  "US30",
  "NAS100",
  "SPX500",
  "BTCUSD",
  "ETHUSD",
] as const;

// ============================================================
// Sessions
// ============================================================
export const SESSIONS = {
  LONDON: {
    label: "London",
    color: "#3B82F6",
    hours: "08:00 - 16:00 GMT",
  },
  NEW_YORK: {
    label: "New York",
    color: "#22C55E",
    hours: "13:00 - 21:00 GMT",
  },
  ASIAN: {
    label: "Asian",
    color: "#F59E0B",
    hours: "00:00 - 08:00 GMT",
  },
} as const;

// ============================================================
// Timeframes
// ============================================================
export const TIMEFRAMES = [
  "1m", "5m", "15m", "30m", "1H", "4H", "D", "W", "M",
] as const;

// ============================================================
// Entry Conditions
// ============================================================
export const ENTRY_CONDITIONS = [
  "Liquidity Sweep",
  "MSS (Market Structure Shift)",
  "FVG (Fair Value Gap)",
  "Order Block",
  "Breaker Block",
  "VWAP",
  "EMA Alignment",
  "Supply/Demand Zone",
  "Imbalance",
  "Inducement",
] as const;

// ============================================================
// Trade Grades
// ============================================================
export const GRADE_CONFIG = {
  A_PLUS: { label: "A+", color: "#22C55E", minScore: 90 },
  A: { label: "A", color: "#4ADE80", minScore: 80 },
  B: { label: "B", color: "#F59E0B", minScore: 65 },
  C: { label: "C", color: "#FB923C", minScore: 50 },
  D: { label: "D", color: "#EF4444", minScore: 0 },
} as const;

// ============================================================
// Nav Items
// ============================================================
export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Trade Journal", href: "/journal", icon: "BookOpen" },
  { label: "Strategy", href: "/strategy", icon: "Target" },
  { label: "Risk Calculator", href: "/risk-calculator", icon: "Calculator" },
  { label: "Analytics", href: "/analytics", icon: "BarChart3" },
  { label: "Violations", href: "/violations", icon: "ShieldAlert" },
  { label: "Settings", href: "/settings", icon: "Settings" },
] as const;

// ============================================================
// Upload Limits
// ============================================================
export const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ],
  maxFilesPerTrade: 3,
} as const;

// ============================================================
// Violation Categories (Default)
// ============================================================
export const DEFAULT_VIOLATION_CATEGORIES = [
  { name: "Entered Before MSS", severity: "HIGH" },
  { name: "Ignored Session Filter", severity: "MEDIUM" },
  { name: "Risked Above Allowed %", severity: "CRITICAL" },
  { name: "Ignored HTF Bias", severity: "HIGH" },
  { name: "No Liquidity Sweep", severity: "MEDIUM" },
  { name: "No FVG Confirmation", severity: "MEDIUM" },
  { name: "Entered Outside Preferred Session", severity: "LOW" },
  { name: "Moved Stop Loss", severity: "CRITICAL" },
  { name: "Removed Stop Loss", severity: "CRITICAL" },
  { name: "Exceeded Daily Loss Limit", severity: "CRITICAL" },
  { name: "Exceeded Daily Trade Limit", severity: "HIGH" },
  { name: "No Confluence", severity: "MEDIUM" },
  { name: "FOMO Entry", severity: "HIGH" },
  { name: "Revenge Trade", severity: "CRITICAL" },
] as const;
