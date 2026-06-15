import { prisma } from "@/lib/prisma";
import { AuditAction } from "@prisma/client";

interface AuditLogInput {
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        details: (input.details as any) ?? undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  } catch (error) {
    // Audit logging should never block the main operation
    console.error("Failed to create audit log:", error);
  }
}

export async function getAuditLogs(
  userId: string,
  options?: {
    entity?: string;
    action?: AuditAction;
    limit?: number;
    offset?: number;
  }
) {
  return prisma.auditLog.findMany({
    where: {
      userId,
      ...(options?.entity && { entity: options.entity }),
      ...(options?.action && { action: options.action }),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  });
}
