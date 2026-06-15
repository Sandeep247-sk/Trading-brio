import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password with bcryptjs
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with default account inside a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "TRADER",
        },
      });

      // Create default trading account
      await tx.account.create({
        data: {
          userId: newUser.id,
          name: "Main Account",
          startingBalance: 0,
          currentBalance: 0,
          currency: "USD",
          isDefault: true,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: "CREATE",
          entity: "user",
          entityId: newUser.id,
          details: { method: "registration" },
        },
      });

      return newUser;
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
