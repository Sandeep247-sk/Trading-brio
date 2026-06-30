"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  User,
  Settings,
  Shield,
  Menu,
  LayoutDashboard,
  BookOpen,
  Target,
  Calculator,
  BarChart3,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountSelector } from "./account-selector";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const pageLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/journal": "Trade Journal",
  "/journal/new": "New Trade",
  "/strategy": "Strategy Builder",
  "/strategy/versions": "Strategy Versions",
  "/risk-calculator": "Risk Calculator",
  "/analytics": "Analytics",
  "/violations": "Rule Violations",
  "/settings": "Settings",
};

const mobileNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Trade Journal", href: "/journal", icon: BookOpen },
  { label: "Strategy", href: "/strategy", icon: Target },
  { label: "Risk Calculator", href: "/risk-calculator", icon: Calculator },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Violations", href: "/violations", icon: ShieldAlert },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const getPageTitle = () => {
    for (const [path, label] of Object.entries(pageLabels)) {
      if (pathname === path) return label;
    }
    // Handle dynamic routes
    if (pathname.startsWith("/journal/")) return "Trade Detail";
    return "Trader Brio";
  };

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "TB";

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40 flex items-center justify-between px-4 md:px-6">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger render={
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          } />
          <SheetContent side="left" className="w-[280px] bg-sidebar p-0">
            <SheetHeader className="p-4 border-b border-sidebar-border">
              <SheetTitle className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded overflow-hidden flex items-center justify-center border border-sidebar-border bg-sidebar-accent/50 shrink-0">
                  <img src="/logo.jpg" alt="Trading Brio" className="w-full h-full object-cover" />
                </div>
                <span>
                  Trading <span className="gradient-text">Brio</span>
                </span>
              </SheetTitle>
            </SheetHeader>
            <nav className="py-4 px-3 space-y-1">
              {mobileNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>

        <div>
          <h2 className="text-lg font-semibold">{getPageTitle()}</h2>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <AccountSelector />
        <ThemeToggle />
        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button
              variant="ghost"
              className="gap-2 px-2 h-9"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium leading-none">
                  {session?.user?.name ?? "Trader"}
                </p>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                  {(session?.user as { role?: string })?.role === "ADMIN" ? "Admin" : "Trader"}
                </p>
              </div>
            </Button>
          } />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={
              <Link href="/settings" className="cursor-pointer" prefetch={false} />
            }>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem render={
              <Link href="/settings" className="cursor-pointer" prefetch={false} />
            }>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
