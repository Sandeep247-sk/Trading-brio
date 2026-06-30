"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Wallet, Plus, Check } from "lucide-react";

interface Account {
  id: string;
  name: string;
  accountType: string;
  currency: string;
  currentBalance: string | number;
}

export const AccountSelector: React.FC = () => {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to read cookies client-side
  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
  };

  // Helper to set cookies client-side
  const setCookie = (name: string, val: string, days = 365) => {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${val};path=/;expires=${date.toUTCString()}`;
  };

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch("/api/accounts");
        if (res.ok) {
          const data = await res.json();
          setAccounts(data);

          // Find selected account from cookie
          const cookieId = getCookie("selected_account_id");
          let active = data.find((a: Account) => a.id === cookieId);

          if (!active && data.length > 0) {
            // Fall back to default account
            active = data.find((a: Account) => (a as any).isDefault) || data[0];
            setCookie("selected_account_id", active.id);
          }

          setSelectedAccount(active || null);
        }
      } catch (err) {
        console.error("Failed to load accounts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  const handleSelect = (account: Account) => {
    setSelectedAccount(account);
    setCookie("selected_account_id", account.id);
    router.refresh();
    // Dispatch a custom event to notify other client components if needed
    window.dispatchEvent(new Event("accountChanged"));
  };

  if (loading) {
    return (
      <div className="h-9 w-32 bg-card border border-border rounded-md animate-pulse" />
    );
  }

  if (accounts.length === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/settings/accounts")}
        className="h-9 gap-1.5 border-dashed border-border text-muted-foreground hover:text-white"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Create Account</span>
      </Button>
    );
  }

  const formatBalance = (val: string | number, curr: string) => {
    const num = Number(val);
    const symbol = curr === "INR" ? "₹" : curr === "EUR" ? "€" : curr === "GBP" ? "£" : "$";
    return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button
          variant="outline"
          className="h-9 px-3 bg-card border-border hover:bg-muted text-foreground gap-2 font-medium text-xs sm:text-sm"
        >
          <Wallet className="h-4 w-4 text-blue-500" />
          <div className="text-left hidden xs:block">
            <p className="leading-none text-[11px] font-semibold text-foreground/80">
              {selectedAccount?.name}
            </p>
            <p className="leading-none text-[9px] text-muted-foreground mt-0.5 font-mono">
              {selectedAccount ? formatBalance(selectedAccount.currentBalance, selectedAccount.currency) : "No Account"}
            </p>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      } />
      <DropdownMenuContent align="end" className="w-56 bg-card border border-border">
        <div className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Switch Account
        </div>
        {accounts.map((acc) => {
          const isSelected = acc.id === selectedAccount?.id;
          return (
            <DropdownMenuItem
              key={acc.id}
              onClick={() => handleSelect(acc)}
              className="flex items-center justify-between px-2.5 py-2 cursor-pointer hover:bg-muted rounded-md text-xs"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-foreground/80">{acc.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {formatBalance(acc.currentBalance, acc.currency)} • {acc.accountType ? acc.accountType.replace(/_/g, " ") : "LIVE"}
                </span>
              </div>
              {isSelected && <Check className="h-4 w-4 text-blue-500" />}
            </DropdownMenuItem>
          );
        })}
        <div className="border-t border-border my-1" />
        <DropdownMenuItem
          onClick={() => router.push("/settings/accounts")}
          className="flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-muted rounded-md text-xs text-blue-400 font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Manage Accounts</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
