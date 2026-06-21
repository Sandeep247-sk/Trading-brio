"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  Target,
  Calculator,
  BarChart3,
  Brain,
  ShieldAlert,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

const iconMap = {
  LayoutDashboard,
  BookOpen,
  Target,
  Calculator,
  BarChart3,
  Brain,
  ShieldAlert,
  Settings,
} as const;

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" as const },
  { label: "Trade Journal", href: "/journal", icon: "BookOpen" as const },
  { label: "Strategy", href: "/strategy", icon: "Target" as const },
  { label: "Risk Calculator", href: "/risk-calculator", icon: "Calculator" as const },
  { label: "Analytics", href: "/analytics", icon: "BarChart3" as const },
  { label: "Coaching", href: "/coaching", icon: "Brain" as const },
  { label: "Violations", href: "/violations", icon: "ShieldAlert" as const },
];

const bottomItems = [
  { label: "Settings", href: "/settings", icon: "Settings" as const },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 sticky top-0",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-sidebar-border",
        collapsed ? "justify-center" : "gap-3"
      )}>
        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 border border-sidebar-border bg-sidebar-accent/50">
          <img src="/logo.jpg" alt="Trader Brio" className="w-full h-full object-cover" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-sm font-bold tracking-tight leading-none">
              Trader <span className="gradient-text">Brio</span>
            </h1>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">v1.0</p>
          </div>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          const link = (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
                collapsed && "justify-center px-0"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!collapsed && (
                <span className="animate-fade-in truncate">{item.label}</span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={link} />
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return link;
        })}
      </nav>

      <Separator className="mx-3" />

      {/* Bottom Nav */}
      <div className="py-4 px-3 space-y-1">
        {bottomItems.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = pathname === item.href;

          const link = (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
                collapsed && "justify-center px-0"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="animate-fade-in">{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={link} />
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return link;
        })}

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full justify-center text-muted-foreground hover:text-foreground mt-2",
            !collapsed && "justify-start px-3"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-3 text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
