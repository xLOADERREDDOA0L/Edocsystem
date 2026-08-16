import { Router, type IRouter } from "express";
import { db, documentsTable, revisionsTable, printTransactionsTable, usersTable, documentRequestsTable, auditLogsTable } from "@workspace/db";
import { eq, count, gte, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (_req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [[{ totalDocuments }], [{ approvedDocuments }], [{ pendingApprovals }], [{ obsoleteDocuments }], [{ todayPrints }], [{ todayRequests }], [{ totalUsers }], [{ totalPrints }]] = await Promise.all([
    db.select({ totalDocuments: count() }).from(documentsTable),
    db.select({ approvedDocuments: count() }).from(documentsTable).where(eq(documentsTable.status, "approved")),
    db.select({ pendingApprovals: count() }).from(revisionsTable).where(eq(revisionsTable.status, "submitted")),
    db.select({ obsoleteDocuments: count() }).from(revisionsTable).where(eq(revisionsTable.status, "obsolete")),
    db.select({ todayPrints: count() }).from(printTransactionsTable).where(gte(printTransactionsTable.printedAt, today)),
    db.select({ todayRequests: count() }).from(documentRequestsTable).where(gte(documentRequestsTable.requestedAt, today)),
    db.select({ totalUsers: count() }).from(usersTable),
    db.select({ totalPrints: count() }).from(printTransactionsTable),
  ]);

  res.json({
    totalDocuments,
    approvedDocuments,
    pendingApprovals,
    obsoleteDocuments,
    todayPrints,
    todayRequests,
    totalUsers,
    totalPrintTransactions: totalPrints,
  });
});

router.get("/dashboard/recent-activity", requireAuth, async (req, res): Promise<void> => {
  const limit = parseInt((req.query.limit as string) ?? "20");
  const rows = await db
    .select({
      id: auditLogsTable.id,
      type: auditLogsTable.action,
      description: auditLogsTable.description,
      userId: auditLogsTable.userId,
      createdAt: auditLogsTable.createdAt,
    })
    .from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit);

  const userIds = [...new Set(rows.map(r => r.userId).filter(Boolean))];
  let userMap: Record<number, string> = {};
  if (userIds.length > 0) {
    const users = await db.select({ id: usersTable.id, fullName: usersTable.fullName }).from(usersTable);
    userMap = Object.fromEntries(users.map(u => [u.id, u.fullName]));
  }

  res.json(rows.map(r => ({
    id: r.id,
    type: r.type,
    description: r.description,
    userName: r.userId ? (userMap[r.userId] ?? "System") : "System",
    documentNumber: null,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.get("/dashboard/document-status-breakdown", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.execute(`
    SELECT status, COUNT(*)::int as count
    FROM documents
    GROUP BY status
    ORDER BY status
  `);
  const data = (rows as any).rows ?? rows;
  res.json(data.map((r: any) => ({ status: r.status, count: Number(r.count) })));
});

router.get("/dashboard/print-activity", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.execute(`
    SELECT DATE(printed_at)::text as date, COUNT(*)::int as count
    FROM print_transactions
    WHERE printed_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(printed_at)
    ORDER BY date
  `);
  const data = (rows as any).rows ?? rows;
  res.json(data.map((r: any) => ({ date: r.date, count: Number(r.count) })));
});

router.get("/dashboard/top-documents", requireAuth, async (req, res): Promise<void> => {
  const limit = parseInt((req.query.limit as string) ?? "10");
  const rows = await db.execute(`
    SELECT pt.document_id, d.document_number, d.title, COUNT(*)::int as print_count
    FROM print_transactions pt
    JOIN documents d ON d.id = pt.document_id
    GROUP BY pt.document_id, d.document_number, d.title
    ORDER BY print_count DESC
    LIMIT ${limit}
  `);
  const data = (rows as any).rows ?? rows;
  res.json(data.map((r: any) => ({
    documentId: r.document_id,
    documentNumber: r.document_number,
    title: r.title,
    printCount: Number(r.print_count),
  })));
});

export default router;
