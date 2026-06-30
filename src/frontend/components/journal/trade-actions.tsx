"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash, Edit, ArrowLeft, Loader2, AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface TradeActionsProps {
  tradeId: string;
}

export const TradeActions: React.FC<TradeActionsProps> = ({ tradeId }) => {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const loadingToast = toast.loading("Deleting trade...");

    try {
      const res = await fetch(`/api/trades/${tradeId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete trade");
      }

      toast.dismiss(loadingToast);
      toast.success("Trade deleted successfully");
      router.push("/journal");
      router.refresh();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "Failed to delete trade");
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Link
        href="/journal"
        className="px-3.5 h-10 border border-border bg-card hover:bg-muted text-muted-foreground hover:text-white rounded-md text-sm font-semibold flex items-center gap-1.5 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>
      <Link
        href={`/journal/${tradeId}/edit`}
        className="px-3.5 h-10 border border-border bg-muted/60 hover:bg-muted text-foreground/80 hover:text-white rounded-md text-sm font-semibold flex items-center gap-1.5 transition"
      >
        <Edit className="h-4 w-4" />
        Edit
      </Link>

      {!showConfirm ? (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="px-3.5 h-10 bg-red-950/20 border border-red-900/50 hover:border-red-600/80 hover:bg-red-650/10 text-red-400 rounded-md text-sm font-semibold flex items-center gap-1.5 transition"
        >
          <Trash className="h-4 w-4" />
          <span>Delete</span>
        </button>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-950/30 border border-red-800/50 rounded-md animate-fade-in">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <span className="text-xs text-red-300 font-medium whitespace-nowrap">Delete this trade?</span>
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold transition disabled:opacity-50 flex items-center gap-1"
          >
            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Yes
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            className="px-2 py-1 bg-muted hover:bg-gray-700 text-foreground/80 rounded text-xs font-bold transition flex items-center gap-0.5"
          >
            <X className="h-3 w-3" />
            No
          </button>
        </div>
      )}
    </div>
  );
};
