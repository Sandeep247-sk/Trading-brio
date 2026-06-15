import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AccountService } from "@/services/account.service";
import { createAccountSchema } from "@/lib/validations/account";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await AccountService.getAccounts(session.user.id);
    return NextResponse.json(accounts);
  } catch (error: any) {
    console.error("GET accounts error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch accounts" },
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
    const parsed = createAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const account = await AccountService.createAccount(session.user.id, parsed.data);
    return NextResponse.json(account, { status: 201 });
  } catch (error: any) {
    console.error("POST accounts error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create account" },
      { status: 500 }
    );
  }
}
