import { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TradeForm } from "@/components/journal/trade-form";

export const metadata: Metadata = {
  title: "New Trade | Trader Brio",
};

export default function NewTradePage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" render={<Link href="/journal" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">New Trade Entry</h1>
          <p className="text-sm text-gray-400 mt-1">
            Record your trade with screenshots and strategy confluences for AI analysis
          </p>
        </div>
      </div>

      <div className="bg-gray-950 border border-gray-850 p-6 rounded-lg">
        <TradeForm />
      </div>
    </div>
  );
}
