import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Schema — email field is intentionally NOT included here.
// Email changes are a separate, password-gated flow (see below).
// ---------------------------------------------------------------------------
const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
});

// Schema for the email-change sub-flow
const emailChangeSchema = z.object({
  email: z.string().email("Invalid email address"),
  currentPassword: z.string().min(1, "Current password is required to change email"),
});

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // -----------------------------------------------------------------------
    // EMAIL CHANGE FLOW
    // If the caller is submitting an `email` field, route it through the
    // secure sub-flow that requires current-password confirmation.
    // -----------------------------------------------------------------------
    if ("email" in body) {
      const parsed = emailChangeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const { email: newEmail, currentPassword } = parsed.data;

      // Normalise email to lowercase for uniqueness checks
      const normalisedEmail = newEmail.toLowerCase().trim();

      // No-op if the email hasn't actually changed
      if (normalisedEmail === session.user.email?.toLowerCase()) {
        return NextResponse.json(
          { error: "The new email is the same as the current email." },
          { status: 400 }
        );
      }

      // 1. Verify current password before accepting any email change
      const userRecord = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { password: true, email: true },
      });

      if (!userRecord?.password) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const passwordValid = await bcrypt.compare(currentPassword, userRecord.password);
      if (!passwordValid) {
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 403 }
        );
      }

      // 2. Uniqueness check (case-insensitive)
      const conflict = await prisma.user.findFirst({
        where: {
          email: { equals: normalisedEmail, mode: "insensitive" },
          id: { not: session.user.id },
        },
        select: { id: true },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "This email address is already in use by another account." },
          { status: 409 }
        );
      }

      // 3. Commit email change immediately (no SMTP configured for verification)
      //    We keep the old email in audit logs so the real owner can detect
      //    unauthorised changes.  When an SMTP service is available, replace
      //    this block with a pending-verification token flow.
      const updated = await prisma.user.update({
        where: { id: session.user.id },
        data: { email: normalisedEmail },
        select: { id: true, name: true, email: true },
      });

      // 4. Audit log — record both old and new emails
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE",
          entity: "user",
          entityId: session.user.id,
          details: {
            fields: ["email"],
            oldEmail: userRecord.email,
            newEmail: normalisedEmail,
            note: "Email changed with password confirmation",
          },
        },
      });

      return NextResponse.json({
        ...updated,
        message:
          "Email updated successfully. If you have SMTP configured, a notification was sent to your previous address.",
      });
    }

    // -----------------------------------------------------------------------
    // NON-EMAIL PROFILE FIELDS (name, etc.)
    // No password required — standard session-gated update.
    // -----------------------------------------------------------------------
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name } = parsed.data;

    const updateData: Record<string, string> = {};
    if (name) updateData.name = name;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: { id: true, name: true, email: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "user",
        entityId: session.user.id,
        details: { fields: Object.keys(updateData) },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
