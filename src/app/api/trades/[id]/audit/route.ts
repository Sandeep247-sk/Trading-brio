import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AIComplianceService } from "@/services/ai-compliance.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // Trigger the AI analysis service
    const analysis = await AIComplianceService.analyzeTrade(session.user.id, id);

    return NextResponse.json({
      message: "AI Audit completed successfully",
      analysis,
    });
  } catch (error: any) {
    console.error("POST trade audit error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to audit trade" },
      { status: 500 }
    );
  }
}
