import { Router, type IRouter } from "express";
import { db, departmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

router.get("/departments", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(departmentsTable).orderBy(departmentsTable.name);
  res.json(rows);
});

router.post("/departments", requireAuth, requireRole("administrator"), async (req, res): Promise<void> => {
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ error: "Name is required" }); return; }
  const [row] = await db.insert(departmentsTable).values({ name, description }).returning();
  await logAudit({ userId: req.authUser!.id, action: "CREATE_DEPARTMENT", module: "departments", description: `Created department: ${name}`, recordType: "department", recordId: row.id, req });
  res.status(201).json(row);
});

router.patch("/departments/:id", requireAuth, requireRole("administrator"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { name, description, status } = req.body;
  const [row] = await db.update(departmentsTable)
    .set({ ...(name && { name }), ...(description !== undefined && { description }), ...(status && { status }) })
    .where(eq(departmentsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Department not found" }); return; }
  res.json(row);
});

export default router;
