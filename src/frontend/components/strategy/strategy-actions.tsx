"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Trash, Loader2, AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface StrategyActionsProps {
  strategyId: string;
}

export const StrategyActions: React.FC<StrategyActionsProps> = ({ strategyId }) => {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const loadingToast = toast.loading("Deleting strategy...");

    try {
      const res = await fetch(`/api/strategies/${strategyId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete strategy");
      }

      toast.dismiss(loadingToast);
      toast.success("Strategy deleted successfully");
      router.refresh();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "Failed to delete strategy");
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="flex items-center space-x-2 shrink-0">
      <Link
        href={`/strategy?action=edit&id=${strategyId}`}
        className="px-2.5 py-1.5 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white rounded text-xs font-semibold inline-flex items-center gap-1 transition"
      >
        <Edit className="h-3.5 w-3.5" />
        Edit Rules
      </Link>

      {!showConfirm ? (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="px-2.5 py-1.5 bg-red-950/20 border border-red-900/50 hover:border-red-600/80 hover:bg-red-650/10 text-red-400 rounded text-xs font-semibold inline-flex items-center gap-1 transition"
        >
          <Trash className="h-3.5 w-3.5" />
          <span>Delete</span>
        </button>
      ) : (
        <div className="flex items-center gap-2 px-2.5 py-1 bg-red-950/30 border border-red-800/50 rounded animate-fade-in">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
          <span className="text-[10px] text-red-300 font-medium whitespace-nowrap">Delete strategy?</span>
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold transition disabled:opacity-50 flex items-center gap-1"
          >
            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Yes
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            className="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[10px] font-bold transition flex items-center gap-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
};
