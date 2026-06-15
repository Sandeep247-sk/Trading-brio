/**
 * Format a number as currency
 */
export function formatCurrency(
  amount: number | string,
  currency: string = "USD"
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format a number as percentage
 */
export function formatPercent(value: number | string, decimals: number = 1): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${num >= 0 ? "+" : ""}${num.toFixed(decimals)}%`;
}

/**
 * Format a number as RR ratio
 */
export function formatRR(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}R`;
}

/**
 * Format a date relative to now
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date and time for display
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a large number with compact notation
 */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
  }).format(value);
}

/**
 * Format price with appropriate decimals
 */
export function formatPrice(value: number | string, pair?: string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  const isGold = pair?.toUpperCase().includes("XAU");
  const isJpy = pair?.toUpperCase().includes("JPY");

  const decimals = isGold ? 2 : isJpy ? 3 : 5;

  return num.toFixed(decimals);
}

/**
 * Get P&L color class
 */
export function getPnlColor(value: number): string {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-zinc-400";
}

/**
 * Get trade result badge variant
 */
export function getResultVariant(
  result: string
): "default" | "destructive" | "secondary" {
  switch (result) {
    case "WIN":
      return "default";
    case "LOSS":
      return "destructive";
    default:
      return "secondary";
  }
}
