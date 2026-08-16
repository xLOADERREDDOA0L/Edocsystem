import { Router, type IRouter } from "express";
import { db, printTransactionsTable, documentsTable, revisionsTable } from "@workspace/db";
import { eq, count, gte, lte, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

const reportRoles = ["administrator", "document_controller", "supervisor"];

router.get("/reports/printing", requireAuth, requireRole(...reportRoles), async (req, res): Promise<void> => {
  const { fromDate, toDate } = req.query as Record<string, string>;

  const conds: any[] = [];
  if (fromDate) conds.push(gte(printTransactionsTable.printedAt, new Date(fromDate)));
  if (toDate) conds.push(lte(printTransactionsTable.printedAt, new Date(toDate)));
  const { and: andFn } = await import("drizzle-orm");
  const where = conds.length > 0 ? andFn(...conds) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(printTransactionsTable).where(where);

  const byDocRaw = await db.execute(`
    SELECT d.document_number, d.title, COUNT(*)::int as print_count
    FROM print_transactions pt
    JOIN documents d ON d.id = pt.document_id
    ${fromDate || toDate ? `WHERE ${[fromDate ? `pt.printed_at >= '${fromDate}'` : null, toDate ? `pt.printed_at <= '${toDate}'` : null].filter(Boolean).join(" AND ")}` : ""}
    GROUP BY d.document_number, d.title
    ORDER BY print_count DESC
  `);
  const byDocument = ((byDocRaw as any).rows ?? byDocRaw).map((r: any) => ({
    documentNumber: r.document_number,
    title: r.title,
    printCount: Number(r.print_count),
  }));

  const byDayRaw = await db.execute(`
    SELECT DATE(printed_at)::text as date, COUNT(*)::int as count
    FROM print_transactions
    ${fromDate || toDate ? `WHERE ${[fromDate ? `printed_at >= '${fromDate}'` : null, toDate ? `printed_at <= '${toDate}'` : null].filter(Boolean).join(" AND ")}` : ""}
    GROUP BY DATE(printed_at)
    ORDER BY date
  `);
  const byDay = ((byDayRaw as any).rows ?? byDayRaw).map((r: any) => ({ date: r.date, count: Number(r.count) }));

  res.json({
    totalPrints: Number(total),
    uniqueDocuments: byDocument.length,
    uniqueEmployees: 0,
    byDocument,
    byDay,
  });
});

router.get("/reports/distribution", requireAuth, requireRole(...reportRoles), async (req, res): Promise<void> => {
  const { fromDate, toDate } = req.query as Record<string, string>;

  const [{ total }] = await db.select({ total: count() }).from(printTransactionsTable);

  const byDeptRaw = await db.execute(`
    SELECT COALESCE(dept.name, 'Unknown') as name, COUNT(*)::int as count
    FROM print_transactions pt
    JOIN documents d ON d.id = pt.document_id
    LEFT JOIN departments dept ON dept.id = d.department_id
    GROUP BY dept.name
    ORDER BY count DESC
  `);
  const byDepartment = ((byDeptRaw as any).rows ?? byDeptRaw).map((r: any) => ({ name: r.name, count: Number(r.count) }));

  const byCatRaw = await db.execute(`
    SELECT COALESCE(cat.name, 'Unknown') as name, COUNT(*)::int as count
    FROM print_transactions pt
    JOIN documents d ON d.id = pt.document_id
    LEFT JOIN categories cat ON cat.id = d.category_id
    GROUP BY cat.name
    ORDER BY count DESC
  `);
  const byCategory = ((byCatRaw as any).rows ?? byCatRaw).map((r: any) => ({ name: r.name, count: Number(r.count) }));

  res.json({ totalDistributions: Number(total), byDepartment, byCategory });
});

router.get("/reports/revisions", requireAuth, requireRole(...reportRoles), async (_req, res): Promise<void> => {
  const [{ total }] = await db.select({ total: count() }).from(revisionsTable);

  const byStatusRaw = await db.execute(`
    SELECT status, COUNT(*)::int as count
    FROM document_revisions
    GROUP BY status
    ORDER BY status
  `);
  const byStatus = ((byStatusRaw as any).rows ?? byStatusRaw).map((r: any) => ({ status: r.status, count: Number(r.count) }));

  const recentRows = await db
    .select({
      id: revisionsTable.id,
      documentId: revisionsTable.documentId,
      revisionNumber: revisionsTable.revisionNumber,
      filePath: revisionsTable.filePath,
      fileName: revisionsTable.fileName,
      status: revisionsTable.status,
      effectiveDate: revisionsTable.effectiveDate,
      uploadedBy: revisionsTable.uploadedBy,
      approvedBy: revisionsTable.approvedBy,
      approvalDate: revisionsTable.approvalDate,
      rejectionReason: revisionsTable.rejectionReason,
      approvalComments: revisionsTable.approvalComments,
      qrToken: revisionsTable.qrToken,
      createdAt: revisionsTable.createdAt,
    })
    .from(revisionsTable)
    .orderBy(revisionsTable.createdAt)
    .limit(10);

  res.json({
    totalRevisions: Number(total),
    byStatus,
    recentRevisions: recentRows.map(r => ({
      ...r,
      uploadedByName: null,
      approvedByName: null,
      approvalDate: r.approvalDate?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

router.get("/reports/obsolete", requireAuth, requireRole(...reportRoles), async (_req, res): Promise<void> => {
  const rows = await db.execute(`
    SELECT d.id as document_id, d.document_number, d.title,
           r.revision_number, r.updated_at::text as obsolete_since
    FROM document_revisions r
    JOIN documents d ON d.id = r.document_id
    WHERE r.status = 'obsolete'
    ORDER BY r.updated_at DESC
  `);
  const data = (rows as any).rows ?? rows;
  res.json(data.map((r: any) => ({
    documentId: r.document_id,
    documentNumber: r.document_number,
    title: r.title,
    revisionNumber: r.revision_number,
    obsoleteSince: r.obsolete_since ?? new Date().toISOString(),
  })));
});

export default router;
