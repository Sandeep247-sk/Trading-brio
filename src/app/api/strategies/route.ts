import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { StrategyService } from "@/services/strategy.service";
import { createStrategySchema } from "@/lib/validations/strategy";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const strategies = await StrategyService.getStrategies(session.user.id);
    return NextResponse.json(strategies);
  } catch (error: any) {
    console.error("GET strategies error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch strategies" },
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

    const body = await request.json();
    const parsed = createStrategySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const strategy = await StrategyService.createStrategy(session.user.id, parsed.data);
    return NextResponse.json(strategy, { status: 201 });
  } catch (error: any) {
    console.error("POST strategies error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create strategy" },
      { status: 500 }
    );
  }
}
