import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { TradeService } from "@/services/trade.service";
import { UploadService } from "@/services/upload.service";
import { AIComplianceService } from "@/services/ai-compliance.service";
import { createTradeSchema } from "@/lib/validations/trade";
import { ImageType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const filters: any = {};
    const pair = searchParams.get("pair");
    if (pair) filters.pair = pair;

    const tradingSession = searchParams.get("session");
    if (tradingSession) filters.session = tradingSession;

    const direction = searchParams.get("direction");
    if (direction) filters.direction = direction;

    const result = searchParams.get("result");
    if (result) filters.result = result;

    const strategyId = searchParams.get("strategyId");
    if (strategyId) filters.strategyId = strategyId;

    const startDate = searchParams.get("startDate");
    if (startDate) filters.startDate = startDate;

    const endDate = searchParams.get("endDate");
    if (endDate) filters.endDate = endDate;

    const cookieStore = await cookies();
    const selectedAccountId = cookieStore.get("selected_account_id")?.value || null;

    const resultData = await TradeService.getTrades(
      session.user.id,
      filters,
      { page, limit },
      selectedAccountId
    );

    return NextResponse.json(resultData);
  } catch (error: any) {
    console.error("GET trades error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch trades" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    let tradeData: any = {};
    let imageFiles: { file: File; type: ImageType }[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      // Read basic fields
      tradeData.pair = formData.get("pair") as string;
      tradeData.date = formData.get("date") as string;
      tradeData.session = formData.get("session") as string;
      tradeData.direction = formData.get("direction") as string;

      const accountId = formData.get("accountId") as string;
      if (accountId && accountId !== "") {
        tradeData.accountId = accountId;
      }
      
      const entryPrice = formData.get("entryPrice");
      if (entryPrice) tradeData.entryPrice = parseFloat(entryPrice as string);
      
      const stopLoss = formData.get("stopLoss");
      if (stopLoss) tradeData.stopLoss = parseFloat(stopLoss as string);
      
      const takeProfit = formData.get("takeProfit");
      if (takeProfit) tradeData.takeProfit = parseFloat(takeProfit as string);
      
      const riskPercent = formData.get("riskPercent");
      if (riskPercent) tradeData.riskPercent = parseFloat(riskPercent as string);

      const result = formData.get("result") as string;
      tradeData.result = result && result !== "" ? result : null;

      const rrAchieved = formData.get("rrAchieved");
      tradeData.rrAchieved = rrAchieved && rrAchieved !== "" ? parseFloat(rrAchieved as string) : null;

      const pnl = formData.get("pnl");
      tradeData.pnl = pnl && pnl !== "" ? parseFloat(pnl as string) : null;

      const notes = formData.get("notes");
      if (notes) tradeData.notes = notes as string;

      const strategyVersionId = formData.get("strategyVersionId");
      if (strategyVersionId && strategyVersionId !== "") {
        tradeData.strategyVersionId = strategyVersionId as string;
      } else {
        tradeData.strategyVersionId = null;
      }

      // Extract image files
      const imagesBefore = formData.getAll("images_BEFORE_ENTRY");
      const imagesEntry = formData.getAll("images_ENTRY");
      const imagesExit = formData.getAll("images_EXIT");

      imagesBefore.forEach((f) => {
        if (f instanceof File && f.size > 0) {
          imageFiles.push({ file: f, type: ImageType.BEFORE_ENTRY });
        }
      });
      imagesEntry.forEach((f) => {
        if (f instanceof File && f.size > 0) {
          imageFiles.push({ file: f, type: ImageType.ENTRY });
        }
      });
      imagesExit.forEach((f) => {
        if (f instanceof File && f.size > 0) {
          imageFiles.push({ file: f, type: ImageType.EXIT });
        }
      });
    } else {
      // JSON format
      tradeData = await request.json();
    }

    // Ensure accountId is populated from cookies if missing
    if (!tradeData.accountId || tradeData.accountId === "") {
      const cookieStore = await cookies();
      const selectedAccountId = cookieStore.get("selected_account_id")?.value;
      if (selectedAccountId) {
        tradeData.accountId = selectedAccountId;
      }
    }

    // Validate using Zod schema
    const parsed = createTradeSchema.safeParse(tradeData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Create the trade
    const trade = await TradeService.createTrade(session.user.id, parsed.data);

    // Save screenshots if present
    const savedImages = [];
    if (imageFiles.length > 0) {
      for (const img of imageFiles) {
        try {
          const savedImg = await UploadService.processAndSaveScreenshot(
            img.file,
            img.type,
            session.user.id,
            trade.id
          );
          savedImages.push(savedImg);
        } catch (uploadErr: any) {
          console.error("Screenshot upload error:", uploadErr);
          // Non-blocking error for trade saving, but we return a warning
        }
      }
    }

    // Trigger background AI analysis
    if (process.env.GEMINI_API_KEY) {
      AIComplianceService.analyzeTrade(session.user.id, trade.id).catch((err) => {
        console.error(`Background AI compliance analysis failed for trade ${trade.id}:`, err);
      });
    }

    return NextResponse.json(
      {
        message: "Trade journaled successfully",
        trade,
        images: savedImages,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST trades error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create trade" },
      { status: 500 }
    );
  }
}
