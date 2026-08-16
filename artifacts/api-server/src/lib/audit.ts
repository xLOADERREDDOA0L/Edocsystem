import { Request } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { logger } from "./logger";

interface AuditParams {
  userId?: number | null;
  action: string;
  module: string;
  description: string;
  recordType?: string;
  recordId?: number;
  oldValue?: string;
  newValue?: string;
  req?: Request;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      userId: params.userId ?? null,
      action: params.action,
      module: params.module,
      description: params.description,
      recordType: params.recordType ?? null,
      recordId: params.recordId ?? null,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      ipAddress: params.req?.ip ?? null,
      userAgent: params.req?.headers?.["user-agent"] ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to write audit log");
  }
}
