import { Router, type IRouter } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, printTransactionsTable, documentsTable, revisionsTable, usersTable } from "@workspace/db";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

function formatTx(t: any) {
  return {
    id: t.id,
    transactionNumber: t.transactionNumber,
    documentId: t.documentId,
    documentNumber: t.documentNumber ?? "",
    documentTitle: t.documentTitle ?? "",
    revisionId: t.revisionId,
    revisionNumber: t.revisionNumber ?? "",
    employeeId: t.employeeId,
    employeeName: t.employeeName ?? "",
    copyNumber: t.copyNumber,
    numberOfCopies: t.numberOfCopies,
    qrToken: t.qrToken,
    status: t.status,
    printedAt: t.printedAt?.toISOString?.() ?? t.printedAt,
    ipAddress: t.ipAddress ?? null,
  };
}

router.post("/print", requireAuth, async (req, res): Promise<void> => {
  const { documentId, revisionId, numberOfCopies, purpose } = req.body;
  if (!documentId || !revisionId || !numberOfCopies) {
    res.status(400).json({ error: "documentId, revisionId, and numberOfCopies are required" });
    return;
  }

  // Re-check authorization server-side
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, documentId));
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

  const [rev] = await db.select().from(revisionsTable).where(eq(revisionsTable.id, revisionId));
  if (!rev) { res.status(404).json({ error: "Revision not found" }); return; }
  if (rev.status !== "approved") { res.status(400).json({ error: "Only approved revisions can be printed" }); return; }
  if (doc.currentRevisionId !== revisionId) { res.status(400).json({ error: "Only the current approved revision can be printed" }); return; }

  const copyNum = Date.now();
  const copyNumber = `COPY-${String(copyNum).slice(-6)}`;
  const transactionNumber = `TX-${Date.now()}`;
  const qrToken = uuidv4().replace(/-/g, "");

  const [tx] = await db.insert(printTransactionsTable).values({
    transactionNumber,
    documentId,
    revisionId,
    employeeId: req.authUser!.id,
    copyNumber,
    numberOfCopies,
    qrToken,
    status: "completed",
    purpose: purpose ?? null,
    ipAddress: req.ip ?? null,
  }).returning();

  await logAudit({
    userId: req.authUser!.id,
    action: "PRINT_DOCUMENT",
    module: "printing",
    description: `Printed document ${doc.documentNumber} Rev ${rev.revisionNumber}, Copy: ${copyNumber}`,
    recordType: "print_transaction",
    recordId: tx.id,
    req,
  });

  res.status(201).json(formatTx({
    ...tx,
    documentNumber: doc.documentNumber,
    documentTitle: doc.title,
    revisionNumber: rev.revisionNumber,
    employeeName: req.authUser!.fullName,
  }));
});

router.get("/print-transactions", requireAuth, async (req, res): Promise<void> => {
  const { documentId, userId, fromDate, toDate } = req.query as Record<string, string>;

  const conditions: any[] = [];
  if (documentId) conditions.push(eq(printTransactionsTable.documentId, parseInt(documentId)));
  if (userId) conditions.push(eq(printTransactionsTable.employeeId, parseInt(userId)));
  if (fromDate) conditions.push(gte(printTransactionsTable.printedAt, new Date(fromDate)));
  if (toDate) conditions.push(lte(printTransactionsTable.printedAt, new Date(toDate)));

  const { and: andFn } = await import("drizzle-orm");
  const where = conditions.length > 0 ? andFn(...conditions) : undefined;

  const rows = await db
    .select({
      id: printTransactionsTable.id,
      transactionNumber: printTransactionsTable.transactionNumber,
      documentId: printTransactionsTable.documentId,
      documentNumber: documentsTable.documentNumber,
      documentTitle: documentsTable.title,
      revisionId: printTransactionsTable.revisionId,
      revisionNumber: revisionsTable.revisionNumber,
      employeeId: printTransactionsTable.employeeId,
      employeeName: usersTable.fullName,
      copyNumber: printTransactionsTable.copyNumber,
      numberOfCopies: printTransactionsTable.numberOfCopies,
      qrToken: printTransactionsTable.qrToken,
      status: printTransactionsTable.status,
      printedAt: printTransactionsTable.printedAt,
      ipAddress: printTransactionsTable.ipAddress,
    })
    .from(printTransactionsTable)
    .leftJoin(documentsTable, eq(printTransactionsTable.documentId, documentsTable.id))
    .leftJoin(revisionsTable, eq(printTransactionsTable.revisionId, revisionsTable.id))
    .leftJoin(usersTable, eq(printTransactionsTable.employeeId, usersTable.id))
    .where(where)
    .orderBy(desc(printTransactionsTable.printedAt));

  res.json(rows.map(formatTx));
});

router.get("/print-transactions/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const [row] = await db
    .select({
      id: printTransactionsTable.id,
      transactionNumber: printTransactionsTable.transactionNumber,
      documentId: printTransactionsTable.documentId,
      documentNumber: documentsTable.documentNumber,
      documentTitle: documentsTable.title,
      revisionId: printTransactionsTable.revisionId,
      revisionNumber: revisionsTable.revisionNumber,
      employeeId: printTransactionsTable.employeeId,
      employeeName: usersTable.fullName,
      copyNumber: printTransactionsTable.copyNumber,
      numberOfCopies: printTransactionsTable.numberOfCopies,
      qrToken: printTransactionsTable.qrToken,
      status: printTransactionsTable.status,
      printedAt: printTransactionsTable.printedAt,
      ipAddress: printTransactionsTable.ipAddress,
    })
    .from(printTransactionsTable)
    .leftJoin(documentsTable, eq(printTransactionsTable.documentId, documentsTable.id))
    .leftJoin(revisionsTable, eq(printTransactionsTable.revisionId, revisionsTable.id))
    .leftJoin(usersTable, eq(printTransactionsTable.employeeId, usersTable.id))
    .where(eq(printTransactionsTable.id, id));

  if (!row) { res.status(404).json({ error: "Transaction not found" }); return; }
  res.json(formatTx(row));
});

export default router;
