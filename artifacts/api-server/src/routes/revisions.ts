import { Router, type IRouter } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, revisionsTable, documentsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

const approverRoles = ["administrator", "document_controller", "supervisor"];

function formatRevision(r: any) {
  return {
    id: r.id,
    documentId: r.documentId,
    revisionNumber: r.revisionNumber,
    filePath: r.filePath ?? null,
    fileName: r.fileName ?? null,
    status: r.status,
    effectiveDate: r.effectiveDate ?? null,
    uploadedByName: r.uploadedByName ?? null,
    approvedByName: r.approvedByName ?? null,
    approvalDate: r.approvalDate?.toISOString?.() ?? null,
    rejectionReason: r.rejectionReason ?? null,
    approvalComments: r.approvalComments ?? null,
    qrToken: r.qrToken ?? null,
    createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
  };
}

router.get("/documents/:id/revisions", requireAuth, async (req, res): Promise<void> => {
  const docId = parseInt(req.params.id as string);
  const uploader = usersTable;
  // join uploaded_by and approved_by separately via enrichment below
  const rows = await db
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
    .where(eq(revisionsTable.documentId, docId))
    .orderBy(revisionsTable.createdAt);

  // enrich with user names
  const userIds = [...new Set([...rows.map(r => r.uploadedBy), ...rows.map(r => r.approvedBy)].filter(Boolean))];
  let userMap: Record<number, string> = {};
  if (userIds.length > 0) {
    const users = await db.select({ id: usersTable.id, fullName: usersTable.fullName }).from(usersTable);
    userMap = Object.fromEntries(users.map(u => [u.id, u.fullName]));
  }

  res.json(rows.map(r => formatRevision({
    ...r,
    uploadedByName: r.uploadedBy ? userMap[r.uploadedBy] : null,
    approvedByName: r.approvedBy ? userMap[r.approvedBy] : null,
  })));
});

router.post("/documents/:id/revisions", requireAuth, async (req, res): Promise<void> => {
  const docId = parseInt(req.params.id as string);
  const { revisionNumber, filePath, fileName, effectiveDate } = req.body;
  if (!revisionNumber || !filePath || !fileName) {
    res.status(400).json({ error: "revisionNumber, filePath, and fileName are required" });
    return;
  }

  const [rev] = await db.insert(revisionsTable).values({
    documentId: docId,
    revisionNumber,
    filePath,
    fileName,
    effectiveDate: effectiveDate ?? null,
    uploadedBy: req.authUser!.id,
    status: "draft",
  }).returning();

  await db.update(documentsTable).set({ status: "draft", updatedAt: new Date() }).where(eq(documentsTable.id, docId));
  await logAudit({ userId: req.authUser!.id, action: "UPLOAD_REVISION", module: "revisions", description: `Uploaded revision ${revisionNumber} for document ID ${docId}`, recordType: "revision", recordId: rev.id, req });

  res.status(201).json(formatRevision({ ...rev, uploadedByName: req.authUser!.fullName, approvedByName: null }));
});

router.post("/documents/:id/revisions/:revId/submit", requireAuth, async (req, res): Promise<void> => {
  const revId = parseInt(req.params.revId as string);
  const [rev] = await db.update(revisionsTable).set({ status: "submitted" }).where(eq(revisionsTable.id, revId)).returning();
  if (!rev) { res.status(404).json({ error: "Revision not found" }); return; }
  await db.update(documentsTable).set({ status: "submitted" }).where(eq(documentsTable.id, rev.documentId));
  await logAudit({ userId: req.authUser!.id, action: "SUBMIT_REVISION", module: "revisions", description: `Submitted revision ${rev.revisionNumber} for review`, recordType: "revision", recordId: revId, req });
  res.json(formatRevision({ ...rev, uploadedByName: null, approvedByName: null }));
});

router.post("/documents/:id/revisions/:revId/approve", requireAuth, requireRole(...approverRoles), async (req, res): Promise<void> => {
  const revId = parseInt(req.params.revId as string);
  const docId = parseInt(req.params.id as string);
  const { comments, effectiveDate } = req.body;

  const qrToken = uuidv4().replace(/-/g, "");

  const [rev] = await db.update(revisionsTable)
    .set({
      status: "approved",
      approvedBy: req.authUser!.id,
      approvalDate: new Date(),
      approvalComments: comments ?? null,
      qrToken,
      ...(effectiveDate && { effectiveDate }),
    })
    .where(eq(revisionsTable.id, revId))
    .returning();

  if (!rev) { res.status(404).json({ error: "Revision not found" }); return; }

  // Mark all previous approved revisions as obsolete
  await db.update(revisionsTable)
    .set({ status: "obsolete" })
    .where(and(
      eq(revisionsTable.documentId, docId),
      eq(revisionsTable.status, "approved"),
    ));

  // Set this as current revision and update document status
  await db.update(revisionsTable).set({ status: "approved" }).where(eq(revisionsTable.id, revId));
  await db.update(documentsTable)
    .set({ status: "approved", currentRevisionId: revId, updatedAt: new Date() })
    .where(eq(documentsTable.id, docId));

  await logAudit({ userId: req.authUser!.id, action: "APPROVE_REVISION", module: "revisions", description: `Approved revision ${rev.revisionNumber}`, recordType: "revision", recordId: revId, req });
  res.json(formatRevision({ ...rev, status: "approved", approvedByName: req.authUser!.fullName }));
});

router.post("/documents/:id/revisions/:revId/reject", requireAuth, requireRole(...approverRoles), async (req, res): Promise<void> => {
  const revId = parseInt(req.params.revId as string);
  const docId = parseInt(req.params.id as string);
  const { reason } = req.body;
  if (!reason) { res.status(400).json({ error: "Rejection reason is required" }); return; }

  const [rev] = await db.update(revisionsTable)
    .set({ status: "rejected", approvedBy: req.authUser!.id, approvalDate: new Date(), rejectionReason: reason })
    .where(eq(revisionsTable.id, revId)).returning();

  if (!rev) { res.status(404).json({ error: "Revision not found" }); return; }
  await db.update(documentsTable).set({ status: "rejected" }).where(eq(documentsTable.id, docId));
  await logAudit({ userId: req.authUser!.id, action: "REJECT_REVISION", module: "revisions", description: `Rejected revision ${rev.revisionNumber}: ${reason}`, recordType: "revision", recordId: revId, req });
  res.json(formatRevision({ ...rev, approvedByName: req.authUser!.fullName }));
});

export default router;
