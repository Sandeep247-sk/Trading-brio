import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TradeService } from "@/services/trade.service";
import { TradeForm } from "@/components/journal/trade-form";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { serializeDecimal } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Edit Trade ${id.substring(0, 8)} | Trading OS`,
  };
}

export default async function EditTradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  
  let trade;
  try {
    trade = await TradeService.getTradeById(session.user.id, id);
  } catch (error) {
    redirect("/journal");
  }

  const serializedTrade = serializeDecimal(trade);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" render={<Link href={`/journal/${id}`} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Edit Trade Journal</h1>
          <p className="text-sm text-gray-400 mt-1">
            Update trade metrics, manage screenshot attachments, or adjust notes
          </p>
        </div>
      </div>

      <div className="bg-gray-950 border border-gray-850 p-6 rounded-lg">
        {/* Pass initial data for editing */}
        <TradeForm initialData={serializedTrade} />
      </div>
    </div>
  );
}
