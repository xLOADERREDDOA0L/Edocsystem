import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, departmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.employeeId, username));

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  if (user.status === "disabled") {
    res.status(401).json({ error: "Account is disabled" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));

  const token = signToken(user.id);

  await logAudit({
    userId: user.id,
    action: "LOGIN",
    module: "auth",
    description: `User ${user.employeeId} logged in`,
    req,
  });

  let departmentName: string | null = null;
  if (user.departmentId) {
    const [dept] = await db.select({ name: departmentsTable.name }).from(departmentsTable).where(eq(departmentsTable.id, user.departmentId));
    departmentName = dept?.name ?? null;
  }

  res.json({
    token,
    user: {
      id: user.id,
      employeeId: user.employeeId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId ?? null,
      departmentName,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
    },
  });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  await logAudit({
    userId: req.authUser!.id,
    action: "LOGOUT",
    module: "auth",
    description: `User ${req.authUser!.employeeId} logged out`,
    req,
  });
  res.sendStatus(204);
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = req.authUser!;
  let departmentName: string | null = null;
  if (user.departmentId) {
    const [dept2] = await db.select({ name: departmentsTable.name }).from(departmentsTable).where(eq(departmentsTable.id, user.departmentId));
    departmentName = dept2?.name ?? null;
  }
  res.json({
    id: user.id,
    employeeId: user.employeeId,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId,
    departmentName,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
  });
});

router.post("/auth/refresh", requireAuth, async (req, res): Promise<void> => {
  const newToken = signToken(req.authUser!.id);
  res.json({ token: newToken });
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Both current and new password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.authUser!.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable)
    .set({ passwordHash: hash, mustChangePassword: false })
    .where(eq(usersTable.id, user.id));

  await logAudit({
    userId: user.id,
    action: "CHANGE_PASSWORD",
    module: "auth",
    description: `User ${user.employeeId} changed their password`,
    req,
  });

  res.json({ message: "Password changed successfully" });
});

export default router;
