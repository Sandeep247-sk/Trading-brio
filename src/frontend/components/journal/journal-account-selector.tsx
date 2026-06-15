"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface Account {
  id: string;
  name: string;
  currency: string;
}

interface JournalAccountSelectorProps {
  accounts: Account[];
  currentAccountId: string;
}

export function JournalAccountSelector({
  accounts,
  currentAccountId,
}: JournalAccountSelectorProps) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    // Set cookie client-side
    document.cookie = `selected_account_id=${val};path=/;max-age=31536000`;
    router.refresh();
    // Dispatch a custom event to notify other client components (e.g. Header dropdown)
    window.dispatchEvent(new Event("accountChanged"));
  };

  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Account</label>
      <select
        value={currentAccountId}
        onChange={handleChange}
        className="w-full h-9 px-2 bg-gray-900 border border-gray-800 rounded text-xs text-gray-300 focus:outline-none focus:border-blue-500 font-semibold"
      >
        {accounts.map((acc) => (
          <option key={acc.id} value={acc.id}>
            {acc.name} ({acc.currency})
          </option>
        ))}
      </select>
    </div>
  );
}
