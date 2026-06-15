import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "success" | "danger" | "warning";
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  const variantStyles = {
    default: "border-border",
    success: "border-emerald-500/20 glow-green",
    danger: "border-red-500/20 glow-red",
    warning: "border-amber-500/20",
  };

  const trendColor = trend
    ? trend.value >= 0
      ? "text-emerald-400"
      : "text-red-400"
    : "";

  return (
    <Card
      className={cn(
        "card-hover bg-card/80 backdrop-blur-sm",
        variantStyles[variant],
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-bold font-mono-numbers animate-count-up">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p className={cn("text-xs font-medium", trendColor)}>
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%{" "}
                <span className="text-muted-foreground font-normal">
                  {trend.label}
                </span>
              </p>
            )}
          </div>
          {icon && (
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
