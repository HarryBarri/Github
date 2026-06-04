import { prisma } from "./prisma";

export async function logAction(params: {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldValues?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValues: params.oldValues ?? undefined,
      newValues: params.newValues ?? undefined,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}
