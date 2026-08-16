import { Router, type IRouter } from "express";
import { db, documentsTable, categoriesTable, departmentsTable, usersTable, revisionsTable } from "@workspace/db";
import { eq, ilike, or, and, count, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

function formatDoc(d: any) {
  return {
    id: d.id,
    documentNumber: d.documentNumber,
    title: d.title,
    categoryId: d.categoryId ?? null,
    categoryName: d.categoryName ?? null,
    departmentId: d.departmentId ?? null,
    departmentName: d.departmentName ?? null,
    description: d.description ?? null,
    status: d.status,
    currentRevisionId: d.currentRevisionId ?? null,
    currentRevisionNumber: d.currentRevisionNumber ?? null,
    createdByName: d.createdByName ?? null,
    createdAt: d.createdAt?.toISOString?.() ?? d.createdAt,
    updatedAt: d.updatedAt?.toISOString?.() ?? d.updatedAt,
  };
}

router.get("/documents", requireAuth, async (req, res): Promise<void> => {
  const { search, status, category, department, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (search) conditions.push(or(ilike(documentsTable.title, `%${search}%`), ilike(documentsTable.documentNumber, `%${search}%`), ilike(documentsTable.description, `%${search}%`))!);
  if (status) conditions.push(eq(documentsTable.status, status));
  if (category) conditions.push(eq(documentsTable.categoryId, parseInt(category)));
  if (department) conditions.push(eq(documentsTable.departmentId, parseInt(department)));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(documentsTable)
    .where(whereClause);

  const rows = await db
    .select({
      id: documentsTable.id,
      documentNumber: documentsTable.documentNumber,
      title: documentsTable.title,
      categoryId: documentsTable.categoryId,
      categoryName: categoriesTable.name,
      departmentId: documentsTable.departmentId,
      departmentName: departmentsTable.name,
      description: documentsTable.description,
      status: documentsTable.status,
      currentRevisionId: documentsTable.currentRevisionId,
      currentRevisionNumber: revisionsTable.revisionNumber,
      createdByName: usersTable.fullName,
      createdAt: documentsTable.createdAt,
      updatedAt: documentsTable.updatedAt,
    })
    .from(documentsTable)
    .leftJoin(categoriesTable, eq(documentsTable.categoryId, categoriesTable.id))
    .leftJoin(departmentsTable, eq(documentsTable.departmentId, departmentsTable.id))
    .leftJoin(usersTable, eq(documentsTable.createdBy, usersTable.id))
    .leftJoin(revisionsTable, eq(documentsTable.currentRevisionId, revisionsTable.id))
    .where(whereClause)
    .orderBy(desc(documentsTable.updatedAt))
    .limit(limitNum)
    .offset(offset);

  res.json({
    data: rows.map(formatDoc),
    total,
    page: pageNum,
    limit: limitNum,
  });
});

router.post("/documents", requireAuth, async (req, res): Promise<void> => {
  const { documentNumber, title, categoryId, departmentId, description } = req.body;
  if (!documentNumber || !title) { res.status(400).json({ error: "documentNumber and title are required" }); return; }

  const existing = await db.select().from(documentsTable).where(eq(documentsTable.documentNumber, documentNumber));
  if (existing.length > 0) { res.status(400).json({ error: "Document number already exists" }); return; }

  const [doc] = await db.insert(documentsTable).values({
    documentNumber, title,
    categoryId: categoryId ?? null,
    departmentId: departmentId ?? null,
    description: description ?? null,
    createdBy: req.authUser!.id,
  }).returning();

  await logAudit({ userId: req.authUser!.id, action: "CREATE_DOCUMENT", module: "documents", description: `Created document ${documentNumber}: ${title}`, recordType: "document", recordId: doc.id, req });
  res.status(201).json(formatDoc({ ...doc, categoryName: null, departmentName: null, currentRevisionNumber: null, createdByName: req.authUser!.fullName }));
});

router.get("/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { printTransactionsTable } = await import("@workspace/db");
  const [row] = await db
    .select({
      id: documentsTable.id,
      documentNumber: documentsTable.documentNumber,
      title: documentsTable.title,
      categoryId: documentsTable.categoryId,
      categoryName: categoriesTable.name,
      departmentId: documentsTable.departmentId,
      departmentName: departmentsTable.name,
      description: documentsTable.description,
      status: documentsTable.status,
      currentRevisionId: documentsTable.currentRevisionId,
      currentRevisionNumber: revisionsTable.revisionNumber,
      createdByName: usersTable.fullName,
      createdAt: documentsTable.createdAt,
      updatedAt: documentsTable.updatedAt,
      revStatus: revisionsTable.status,
      revEffectiveDate: revisionsTable.effectiveDate,
      revQrToken: revisionsTable.qrToken,
    })
    .from(documentsTable)
    .leftJoin(categoriesTable, eq(documentsTable.categoryId, categoriesTable.id))
    .leftJoin(departmentsTable, eq(documentsTable.departmentId, departmentsTable.id))
    .leftJoin(usersTable, eq(documentsTable.createdBy, usersTable.id))
    .leftJoin(revisionsTable, eq(documentsTable.currentRevisionId, revisionsTable.id))
    .where(eq(documentsTable.id, id));

  if (!row) { res.status(404).json({ error: "Document not found" }); return; }

  const [{ printCount }] = await db
    .select({ printCount: count() })
    .from(printTransactionsTable)
    .where(eq(printTransactionsTable.documentId, id));

  const currentRevision = row.currentRevisionId ? {
    id: row.currentRevisionId,
    documentId: id,
    revisionNumber: row.currentRevisionNumber,
    filePath: null,
    fileName: null,
    status: row.revStatus,
    effectiveDate: row.revEffectiveDate ?? null,
    uploadedByName: null,
    approvedByName: null,
    approvalDate: null,
    rejectionReason: null,
    approvalComments: null,
    qrToken: row.revQrToken ?? null,
    createdAt: row.createdAt.toISOString(),
  } : null;

  await logAudit({ userId: req.authUser!.id, action: "VIEW_DOCUMENT", module: "documents", description: `Viewed document ${row.documentNumber}`, recordType: "document", recordId: id, req });

  res.json({
    ...formatDoc(row),
    currentRevision,
    printCount,
  });
});

router.patch("/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { title, categoryId, departmentId, description } = req.body;
  const [doc] = await db.update(documentsTable)
    .set({ ...(title && { title }), ...(categoryId !== undefined && { categoryId }), ...(departmentId !== undefined && { departmentId }), ...(description !== undefined && { description }) })
    .where(eq(documentsTable.id, id)).returning();
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  res.json(formatDoc({ ...doc, categoryName: null, departmentName: null, currentRevisionNumber: null, createdByName: null }));
});

export default router;
