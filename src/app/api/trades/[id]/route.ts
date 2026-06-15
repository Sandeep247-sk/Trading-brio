import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TradeService } from "@/services/trade.service";
import { UploadService } from "@/services/upload.service";
import { AIComplianceService } from "@/services/ai-compliance.service";
import { updateTradeSchema } from "@/lib/validations/trade";
import { ImageType } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const trade = await TradeService.getTradeById(session.user.id, id);
    return NextResponse.json(trade);
  } catch (error: any) {
    console.error("GET trade error:", error);
    if (error.message?.includes("Unauthorized") || error.message?.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to fetch trade" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const contentType = request.headers.get("content-type") || "";
    let tradeData: any = {};
    let imageFiles: { file: File; type: ImageType }[] = [];
    let deleteImageIds: string[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      // Read basic fields
      const pair = formData.get("pair");
      if (pair) tradeData.pair = pair as string;

      const date = formData.get("date");
      if (date) tradeData.date = date as string;

      const sessionField = formData.get("session");
      if (sessionField) tradeData.session = sessionField as string;

      const direction = formData.get("direction");
      if (direction) tradeData.direction = direction as string;
      
      const entryPrice = formData.get("entryPrice");
      if (entryPrice) tradeData.entryPrice = parseFloat(entryPrice as string);
      
      const stopLoss = formData.get("stopLoss");
      if (stopLoss) tradeData.stopLoss = parseFloat(stopLoss as string);
      
      const takeProfit = formData.get("takeProfit");
      if (takeProfit) tradeData.takeProfit = parseFloat(takeProfit as string);
      
      const riskPercent = formData.get("riskPercent");
      if (riskPercent) tradeData.riskPercent = parseFloat(riskPercent as string);

      const result = formData.get("result");
      if (result !== null) {
        tradeData.result = result === "" ? null : (result as string);
      }

      const rrAchieved = formData.get("rrAchieved");
      if (rrAchieved !== null) {
        tradeData.rrAchieved = rrAchieved === "" ? null : parseFloat(rrAchieved as string);
      }

      const pnl = formData.get("pnl");
      if (pnl !== null) {
        tradeData.pnl = pnl === "" ? null : parseFloat(pnl as string);
      }

      const notes = formData.get("notes");
      if (notes !== null) tradeData.notes = notes as string || undefined;

      const strategyVersionId = formData.get("strategyVersionId");
      if (strategyVersionId !== null) {
        tradeData.strategyVersionId = strategyVersionId === "" ? null : (strategyVersionId as string);
      }

      // Extract image files to add
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

      // Extract image IDs to delete
      const delIds = formData.get("deleteImageIds");
      if (delIds) {
        try {
          deleteImageIds = JSON.parse(delIds as string);
        } catch {
          // Fallback if not stringified JSON array
          deleteImageIds = (delIds as string).split(",").filter(Boolean);
        }
      }
    } else {
      // JSON format
      const body = await request.json();
      const { deleteImageIds: ids, ...rest } = body;
      tradeData = rest;
      if (Array.isArray(ids)) {
        deleteImageIds = ids;
      }
    }

    // Validate using partial Zod schema
    const parsed = updateTradeSchema.safeParse(tradeData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // 1. Delete requested images
    if (deleteImageIds.length > 0) {
      for (const imgId of deleteImageIds) {
        try {
          await UploadService.deleteScreenshot(session.user.id, imgId);
        } catch (delErr: any) {
          console.error(`Failed to delete image ${imgId}:`, delErr);
        }
      }
    }

    // 2. Update trade text metadata
    const trade = await TradeService.updateTrade(session.user.id, id, parsed.data);

    // 3. Save new screenshots if present
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
          console.error("Screenshot upload error during update:", uploadErr);
        }
      }
    }

    // Trigger background AI analysis
    if (process.env.GEMINI_API_KEY) {
      AIComplianceService.analyzeTrade(session.user.id, id).catch((err) => {
        console.error(`Background AI compliance analysis failed for trade ${id}:`, err);
      });
    }

    return NextResponse.json({
      message: "Trade updated successfully",
      trade,
      addedImages: savedImages,
    });
  } catch (error: any) {
    console.error("PUT trade error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update trade" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await TradeService.deleteTrade(session.user.id, id);
    return NextResponse.json({ message: "Trade deleted successfully" });
  } catch (error: any) {
    console.error("DELETE trade error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete trade" },
      { status: 500 }
    );
  }
}
