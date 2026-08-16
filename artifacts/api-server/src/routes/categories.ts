import { Router, type IRouter } from "express";
import { db, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

router.get("/categories", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(rows);
});

router.post("/categories", requireAuth, requireRole("administrator", "document_controller"), async (req, res): Promise<void> => {
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ error: "Name is required" }); return; }
  const [row] = await db.insert(categoriesTable).values({ name, description }).returning();
  await logAudit({ userId: req.authUser!.id, action: "CREATE_CATEGORY", module: "categories", description: `Created category: ${name}`, recordType: "category", recordId: row.id, req });
  res.status(201).json(row);
});

router.patch("/categories/:id", requireAuth, requireRole("administrator", "document_controller"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { name, description, status } = req.body;
  const [row] = await db.update(categoriesTable)
    .set({ ...(name && { name }), ...(description !== undefined && { description }), ...(status && { status }) })
    .where(eq(categoriesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Category not found" }); return; }
  res.json(row);
});

export default router;
