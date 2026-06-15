import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TradeService } from "@/services/trade.service";
import { AccountService } from "@/services/account.service";
import { RiskCalculator } from "@/components/calculator/risk-calculator";

export const metadata: Metadata = {
  title: "Risk Calculator | Trading OS",
};

export default async function RiskCalculatorPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const selectedAccountId = cookieStore.get("selected_account_id")?.value || null;
  const account = await TradeService.getOrCreateUserAccount(session.user.id, selectedAccountId);
  const metrics = await AccountService.getAccountMetrics(session.user.id, account.id);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-gray-900 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-gray-100 sm:text-2xl">
          Risk Calculator
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Calculate position size and manage risk per trade for{" "}
          <span className="text-blue-400 font-semibold">{metrics.accountInfo.name}</span>
        </p>
      </div>

      <RiskCalculator
        accountBalance={metrics.accountInfo.currentBalance}
        currency={metrics.accountInfo.currency}
        maxRiskPerTrade={metrics.accountInfo.limits.maxRiskPerTrade}
      />
    </div>
  );
}
