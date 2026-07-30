import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { TradeService } from "@/services/trade.service";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = (searchParams.get("timeframe") || "month") as
      | "week"
      | "month"
      | "year"
      | "all";
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth()), 10);

    const cookieStore = await cookies();
    const selectedAccountId = cookieStore.get("selected_account_id")?.value || null;

    const data = await TradeService.getCalendarData(
      session.user.id,
      selectedAccountId,
      timeframe,
      year,
      month
    );

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET calendar error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}
