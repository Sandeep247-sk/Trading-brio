import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    const dateFilter: Record<string, Date> = {};
    if (fromDate) dateFilter.gte = new Date(fromDate);
    if (toDate) dateFilter.lte = new Date(toDate);

    const trades = await prisma.trade.findMany({
      where: {
        account: { userId: session.user.id },
        deletedAt: null,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      },
      include: {
        account: { select: { name: true, currency: true } },
        strategyVersion: { include: { strategy: { select: { name: true } } } },
      },
      orderBy: { date: "desc" },
    });

    const exportData = trades.map((t) => ({
      date: new Date(t.date).toISOString(),
      account: t.account.name,
      pair: t.pair,
      direction: t.direction,
      session: t.session,
      entryPrice: Number(t.entryPrice),
      stopLoss: Number(t.stopLoss),
      takeProfit: Number(t.takeProfit),
      riskPercent: Number(t.riskPercent),
      result: t.result || "PENDING",
      rrAchieved: t.rrAchieved ? Number(t.rrAchieved) : null,
      pnl: t.pnl ? Number(t.pnl) : 0,
      strategy: t.strategyVersion?.strategy?.name || "None",
      notes: t.notes || "",
      currency: t.account.currency,
    }));

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "EXPORT",
        entity: "trade",
        details: { format, count: exportData.length, fromDate, toDate },
      },
    });

    if (format === "csv") {
      const headers = Object.keys(exportData[0] || {});
      const csvRows = [
        headers.join(","),
        ...exportData.map((row) =>
          headers.map((h) => {
            const val = (row as Record<string, unknown>)[h];
            const str = val === null || val === undefined ? "" : String(val);
            return str.includes(",") || str.includes('"') || str.includes("\n")
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          }).join(",")
        ),
      ];
      const csvContent = csvRows.join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="trading-os-export-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json(exportData, {
      headers: {
        "Content-Disposition": `attachment; filename="trading-os-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
