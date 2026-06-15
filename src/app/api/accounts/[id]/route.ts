import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { AccountService } from "@/services/account.service";
import { updateAccountSchema } from "@/lib/validations/account";

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
    const accountData = await AccountService.getAccountMetrics(session.user.id, id);
    return NextResponse.json(accountData);
  } catch (error: any) {
    console.error("GET account details error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch account" },
      { status: 500 }
    );
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
    const parsed = updateAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const account = await AccountService.updateAccount(session.user.id, id, parsed.data);

    // If it is set as default, we can cookie it as selected
    if (parsed.data.isDefault) {
      const cookieStore = await cookies();
      cookieStore.set("selected_account_id", id, { path: "/" });
    }

    return NextResponse.json({
      message: "Account updated successfully",
      account,
    });
  } catch (error: any) {
    console.error("PUT account error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update account" },
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
    await AccountService.deleteAccount(session.user.id, id);

    // Clear active cookie if it matches the deleted account
    const cookieStore = await cookies();
    const selectedAccountId = cookieStore.get("selected_account_id")?.value;
    if (selectedAccountId === id) {
      cookieStore.delete("selected_account_id");
    }

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (error: any) {
    console.error("DELETE account error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete account" },
      { status: 500 }
    );
  }
}
