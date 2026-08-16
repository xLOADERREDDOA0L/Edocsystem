import { Router, type IRouter } from "express";
import { db, printTransactionsTable, revisionsTable, documentsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

router.get("/verify/:token", async (req, res): Promise<void> => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const verifiedAt = new Date().toISOString();

  // First look in print_transactions (copy-specific QR)
  const [tx] = await db
    .select({
      id: printTransactionsTable.id,
      documentId: printTransactionsTable.documentId,
      revisionId: printTransactionsTable.revisionId,
      copyNumber: printTransactionsTable.copyNumber,
      printedAt: printTransactionsTable.printedAt,
      employeeId: printTransactionsTable.employeeId,
    })
    .from(printTransactionsTable)
    .where(eq(printTransactionsTable.qrToken, token));

  if (!tx) {
    // Check revision-level QR token
    const [rev] = await db
      .select({
        id: revisionsTable.id,
        documentId: revisionsTable.documentId,
        revisionNumber: revisionsTable.revisionNumber,
        status: revisionsTable.status,
        effectiveDate: revisionsTable.effectiveDate,
      })
      .from(revisionsTable)
      .where(eq(revisionsTable.qrToken, token));

    if (!rev) {
      res.json({ valid: false, status: "invalid", verifiedAt, message: "QR code could not be verified. This document may be invalid or tampered." });
      return;
    }

    const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, rev.documentId));
    const isObsolete = rev.status === "obsolete";
    const currentRev = doc?.currentRevisionId ? await db.select({ revisionNumber: revisionsTable.revisionNumber }).from(revisionsTable).where(eq(revisionsTable.id, doc.currentRevisionId)) : [];

    await logAudit({ action: "QR_VERIFY", module: "verification", description: `QR verification for document ${doc?.documentNumber} Rev ${rev.revisionNumber}`, recordType: "revision", recordId: rev.id });

    if (isObsolete) {
      res.json({
        valid: false, status: "obsolete",
        documentNumber: doc?.documentNumber ?? null,
        documentTitle: doc?.title ?? null,
        revisionNumber: rev.revisionNumber,
        documentStatus: rev.status,
        effectiveDate: rev.effectiveDate ?? null,
        copyNumber: null, printedBy: null, printedAt: null,
        currentRevisionNumber: currentRev[0]?.revisionNumber ?? null,
        verifiedAt,
        message: "This document revision is OBSOLETE. It has been superseded by a newer revision.",
      });
      return;
    }

    res.json({
      valid: true, status: "valid",
      documentNumber: doc?.documentNumber ?? null,
      documentTitle: doc?.title ?? null,
      revisionNumber: rev.revisionNumber,
      documentStatus: rev.status,
      effectiveDate: rev.effectiveDate ?? null,
      copyNumber: null, printedBy: null, printedAt: null,
      currentRevisionNumber: rev.revisionNumber,
      verifiedAt,
      message: "Document verified. This is the current approved revision.",
    });
    return;
  }

  // Found in print transactions
  const [rev] = await db.select().from(revisionsTable).where(eq(revisionsTable.id, tx.revisionId));
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, tx.documentId));
  const isObsolete = rev?.status === "obsolete";

  const currentRev = doc?.currentRevisionId
    ? await db.select({ revisionNumber: revisionsTable.revisionNumber }).from(revisionsTable).where(eq(revisionsTable.id, doc.currentRevisionId))
    : [];

  // Get employee name
  const [emp] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, tx.employeeId));

  await logAudit({ action: "QR_VERIFY", module: "verification", description: `QR verification for printed copy ${tx.copyNumber} of ${doc?.documentNumber}`, recordType: "print_transaction", recordId: tx.id });

  if (isObsolete) {
    res.json({
      valid: false, status: "obsolete",
      documentNumber: doc?.documentNumber ?? null,
      documentTitle: doc?.title ?? null,
      revisionNumber: rev?.revisionNumber ?? null,
      documentStatus: rev?.status ?? null,
      effectiveDate: rev?.effectiveDate ?? null,
      copyNumber: tx.copyNumber,
      printedBy: emp?.fullName ?? null,
      printedAt: tx.printedAt.toISOString(),
      currentRevisionNumber: currentRev[0]?.revisionNumber ?? null,
      verifiedAt,
      message: "OBSOLETE DOCUMENT. This printed copy is based on a superseded revision.",
    });
    return;
  }

  res.json({
    valid: true, status: "valid",
    documentNumber: doc?.documentNumber ?? null,
    documentTitle: doc?.title ?? null,
    revisionNumber: rev?.revisionNumber ?? null,
    documentStatus: rev?.status ?? null,
    effectiveDate: rev?.effectiveDate ?? null,
    copyNumber: tx.copyNumber,
    printedBy: emp?.fullName ?? null,
    printedAt: tx.printedAt.toISOString(),
    currentRevisionNumber: currentRev[0]?.revisionNumber ?? null,
    verifiedAt,
    message: "Document verified. This is a valid controlled copy.",
  });
});

export default router;
