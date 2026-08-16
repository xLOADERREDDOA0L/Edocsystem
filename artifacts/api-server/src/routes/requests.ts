import { Router, type IRouter } from "express";
import { db, documentRequestsTable, documentsTable, revisionsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

function formatRequest(r: any) {
  return {
    id: r.id,
    requestNumber: r.requestNumber,
    documentId: r.documentId,
    documentNumber: r.documentNumber ?? "",
    documentTitle: r.documentTitle ?? "",
    revisionId: r.revisionId ?? null,
    revisionNumber: r.revisionNumber ?? null,
    requestedByName: r.requestedByName ?? "",
    purpose: r.purpose ?? null,
    status: r.status,
    requestedAt: r.requestedAt?.toISOString?.() ?? r.requestedAt,
    approvedAt: r.approvedAt?.toISOString?.() ?? null,
  };
}

router.get("/requests", requireAuth, async (req, res): Promise<void> => {
  const { status, mine } = req.query as Record<string, string>;
  const rows = await db
    .select({
      id: documentRequestsTable.id,
      requestNumber: documentRequestsTable.requestNumber,
      documentId: documentRequestsTable.documentId,
      documentNumber: documentsTable.documentNumber,
      documentTitle: documentsTable.title,
      revisionId: documentRequestsTable.revisionId,
      revisionNumber: revisionsTable.revisionNumber,
      requestedByName: usersTable.fullName,
      purpose: documentRequestsTable.purpose,
      status: documentRequestsTable.status,
      requestedAt: documentRequestsTable.requestedAt,
      approvedAt: documentRequestsTable.approvedAt,
      requestedBy: documentRequestsTable.requestedBy,
    })
    .from(documentRequestsTable)
    .leftJoin(documentsTable, eq(documentRequestsTable.documentId, documentsTable.id))
    .leftJoin(revisionsTable, eq(documentRequestsTable.revisionId, revisionsTable.id))
    .leftJoin(usersTable, eq(documentRequestsTable.requestedBy, usersTable.id))
    .orderBy(documentRequestsTable.requestedAt);

  let filtered = rows;
  if (mine === "true") filtered = rows.filter(r => r.requestedBy === req.authUser!.id);
  if (status) filtered = filtered.filter(r => r.status === status);

  res.json(filtered.map(formatRequest));
});

router.post("/requests", requireAuth, async (req, res): Promise<void> => {
  const { documentId, revisionId, purpose, numberOfCopies } = req.body;
  if (!documentId || !revisionId) { res.status(400).json({ error: "documentId and revisionId are required" }); return; }

  const requestNumber = `REQ-${Date.now()}`;
  const [row] = await db.insert(documentRequestsTable).values({
    requestNumber,
    documentId,
    revisionId,
    requestedBy: req.authUser!.id,
    purpose: purpose ?? null,
    numberOfCopies: numberOfCopies ?? 1,
    status: "pending",
  }).returning();

  await logAudit({ userId: req.authUser!.id, action: "CREATE_REQUEST", module: "requests", description: `Created document request ${requestNumber}`, recordType: "request", recordId: row.id, req });
  res.status(201).json(formatRequest({ ...row, documentNumber: "", documentTitle: "", revisionNumber: null, requestedByName: req.authUser!.fullName }));
});

router.post("/requests/:id/approve", requireAuth, requireRole("administrator", "document_controller", "supervisor"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const [row] = await db.update(documentRequestsTable)
    .set({ status: "approved", approvedAt: new Date() })
    .where(eq(documentRequestsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Request not found" }); return; }
  await logAudit({ userId: req.authUser!.id, action: "APPROVE_REQUEST", module: "requests", description: `Approved request ${row.requestNumber}`, recordType: "request", recordId: id, req });
  res.json(formatRequest({ ...row, documentNumber: "", documentTitle: "", revisionNumber: null, requestedByName: "" }));
});

router.post("/requests/:id/reject", requireAuth, requireRole("administrator", "document_controller", "supervisor"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { reason } = req.body;
  const [row] = await db.update(documentRequestsTable)
    .set({ status: "rejected", rejectionReason: reason ?? null })
    .where(eq(documentRequestsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Request not found" }); return; }
  await logAudit({ userId: req.authUser!.id, action: "REJECT_REQUEST", module: "requests", description: `Rejected request ${row.requestNumber}`, recordType: "request", recordId: id, req });
  res.json(formatRequest({ ...row, documentNumber: "", documentTitle: "", revisionNumber: null, requestedByName: "" }));
});

export default router;
