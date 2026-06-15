import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { StrategyService } from "@/services/strategy.service";
import { updateStrategySchema } from "@/lib/validations/strategy";

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
    const strategy = await StrategyService.getStrategyById(session.user.id, id);
    return NextResponse.json(strategy);
  } catch (error: any) {
    console.error("GET strategy error:", error);
    if (error.message?.includes("Unauthorized") || error.message?.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to fetch strategy" }, { status: 500 });
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
    const body = await request.json();
    const { changelogNotes, ...rest } = body;

    const parsed = updateStrategySchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const strategy = await StrategyService.updateStrategy(
      session.user.id,
      id,
      {
        ...parsed.data,
        changelogNotes,
      }
    );

    return NextResponse.json({
      message: "Strategy updated successfully",
      strategy,
    });
  } catch (error: any) {
    console.error("PUT strategy error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update strategy" },
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
    await StrategyService.deleteStrategy(session.user.id, id);
    return NextResponse.json({ message: "Strategy deleted successfully" });
  } catch (error: any) {
    console.error("DELETE strategy error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete strategy" },
      { status: 500 }
    );
  }
}
