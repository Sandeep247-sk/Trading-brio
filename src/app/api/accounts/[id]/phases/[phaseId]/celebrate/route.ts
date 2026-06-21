import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: accountId, phaseId } = await params;

    // Verify account ownership
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: session.user.id },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Update the phase status to celebrated
    const updatedPhase = await prisma.challengePhase.update({
      where: { id: phaseId, accountId },
      data: { celebrated: true },
    });

    return NextResponse.json({
      message: "Phase celebrated status updated",
      phase: updatedPhase,
    });
  } catch (error: any) {
    console.error("PUT celebrate error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update phase celebrated status" },
      { status: 500 }
    );
  }
}
