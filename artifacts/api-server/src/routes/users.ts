import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, departmentsTable } from "@workspace/db";
import { eq, sql, ilike, or } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

const adminRoles = ["administrator"];
const managerRoles = ["administrator", "document_controller"];

router.get("/users", requireAuth, requireRole(...adminRoles, "document_controller", "supervisor"), async (req, res): Promise<void> => {
  const { role, department, status, search } = req.query as Record<string, string>;

  let query = db
    .select({
      id: usersTable.id,
      employeeId: usersTable.employeeId,
      fullName: usersTable.fullName,
      email: usersTable.email,
      role: usersTable.role,
      departmentId: usersTable.departmentId,
      departmentName: departmentsTable.name,
      status: usersTable.status,
      mustChangePassword: usersTable.mustChangePassword,
      lastLogin: usersTable.lastLogin,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(departmentsTable, eq(usersTable.departmentId, departmentsTable.id))
    .$dynamic();

  const conditions = [];
  if (role) conditions.push(eq(usersTable.role, role));
  if (department) conditions.push(eq(usersTable.departmentId, parseInt(department)));
  if (status) conditions.push(eq(usersTable.status, status));
  if (search) {
    conditions.push(
      or(
        ilike(usersTable.fullName, `%${search}%`),
        ilike(usersTable.employeeId, `%${search}%`),
        ilike(usersTable.email, `%${search}%`)
      )!
    );
  }

  if (conditions.length > 0) {
    const { and } = await import("drizzle-orm");
    query = query.where(and(...conditions));
  }

  const users = await query.orderBy(usersTable.createdAt);

  res.json(
    users.map((u) => ({
      ...u,
      lastLogin: u.lastLogin?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    }))
  );
});

router.post("/users", requireAuth, requireRole(...adminRoles), async (req, res): Promise<void> => {
  const { employeeId, fullName, email, password, role, departmentId, mustChangePassword } = req.body;
  if (!employeeId || !fullName || !email || !password || !role) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.employeeId, employeeId));
  if (existing.length > 0) {
    res.status(400).json({ error: "Employee ID already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ employeeId, fullName, email, passwordHash, role, departmentId: departmentId ?? null, mustChangePassword: mustChangePassword ?? false })
    .returning();

  await logAudit({ userId: req.authUser!.id, action: "CREATE_USER", module: "users", description: `Created user ${employeeId}`, recordType: "user", recordId: user.id, req });

  res.status(201).json({ ...user, lastLogin: null, createdAt: user.createdAt.toISOString() });
});

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const [user] = await db
    .select({
      id: usersTable.id,
      employeeId: usersTable.employeeId,
      fullName: usersTable.fullName,
      email: usersTable.email,
      role: usersTable.role,
      departmentId: usersTable.departmentId,
      departmentName: departmentsTable.name,
      status: usersTable.status,
      mustChangePassword: usersTable.mustChangePassword,
      lastLogin: usersTable.lastLogin,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(departmentsTable, eq(usersTable.departmentId, departmentsTable.id))
    .where(eq(usersTable.id, id));

  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ ...user, lastLogin: user.lastLogin?.toISOString() ?? null, createdAt: user.createdAt.toISOString() });
});

router.patch("/users/:id", requireAuth, requireRole(...adminRoles), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { fullName, email, role, departmentId } = req.body;
  const [user] = await db
    .update(usersTable)
    .set({ ...(fullName && { fullName }), ...(email && { email }), ...(role && { role }), ...(departmentId !== undefined && { departmentId }) })
    .where(eq(usersTable.id, id))
    .returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  await logAudit({ userId: req.authUser!.id, action: "UPDATE_USER", module: "users", description: `Updated user ${user.employeeId}`, recordType: "user", recordId: user.id, req });
  res.json({ ...user, lastLogin: user.lastLogin?.toISOString() ?? null, createdAt: user.createdAt.toISOString() });
});

router.post("/users/:id/disable", requireAuth, requireRole(...adminRoles), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const [user] = await db.update(usersTable).set({ status: "disabled" }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  await logAudit({ userId: req.authUser!.id, action: "DISABLE_USER", module: "users", description: `Disabled user ${user.employeeId}`, recordType: "user", recordId: user.id, req });
  res.json({ ...user, lastLogin: user.lastLogin?.toISOString() ?? null, createdAt: user.createdAt.toISOString() });
});

router.post("/users/:id/enable", requireAuth, requireRole(...adminRoles), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const [user] = await db.update(usersTable).set({ status: "active" }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  await logAudit({ userId: req.authUser!.id, action: "ENABLE_USER", module: "users", description: `Enabled user ${user.employeeId}`, recordType: "user", recordId: user.id, req });
  res.json({ ...user, lastLogin: user.lastLogin?.toISOString() ?? null, createdAt: user.createdAt.toISOString() });
});

router.post("/users/:id/reset-password", requireAuth, requireRole(...adminRoles), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { newPassword } = req.body;
  if (!newPassword) { res.status(400).json({ error: "newPassword is required" }); return; }
  const hash = await bcrypt.hash(newPassword, 10);
  const [user] = await db.update(usersTable).set({ passwordHash: hash, mustChangePassword: true }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  await logAudit({ userId: req.authUser!.id, action: "RESET_PASSWORD", module: "users", description: `Reset password for user ${user.employeeId}`, recordType: "user", recordId: user.id, req });
  res.json({ message: "Password reset" });
});

export default router;
