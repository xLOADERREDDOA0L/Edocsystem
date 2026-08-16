import { Router, type IRouter } from "express";
import { db, auditLogsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, ilike, count, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/audit-logs", requireAuth, requireRole("administrator", "document_controller"), async (req, res): Promise<void> => {
  const { userId, action, module, fromDate, toDate, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (userId) conditions.push(eq(auditLogsTable.userId, parseInt(userId)));
  if (action) conditions.push(ilike(auditLogsTable.action, `%${action}%`));
  if (module) conditions.push(eq(auditLogsTable.module, module));
  if (fromDate) conditions.push(gte(auditLogsTable.createdAt, new Date(fromDate)));
  if (toDate) conditions.push(lte(auditLogsTable.createdAt, new Date(toDate)));

  const { and: andFn } = await import("drizzle-orm");
  const where = conditions.length > 0 ? andFn(...conditions) : undefined;

  const [[{ total }], rows] = await Promise.all([
    db.select({ total: count() }).from(auditLogsTable).where(where),
    db
      .select({
        id: auditLogsTable.id,
        userId: auditLogsTable.userId,
        userName: usersTable.fullName,
        action: auditLogsTable.action,
        module: auditLogsTable.module,
        description: auditLogsTable.description,
        recordType: auditLogsTable.recordType,
        recordId: auditLogsTable.recordId,
        ipAddress: auditLogsTable.ipAddress,
        createdAt: auditLogsTable.createdAt,
      })
      .from(auditLogsTable)
      .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
      .where(where)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limitNum)
      .offset(offset),
  ]);

  res.json({
    data: rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })),
    total,
    page: pageNum,
    limit: limitNum,
  });
});

export default router;
