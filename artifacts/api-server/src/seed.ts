import "dotenv/config";
import { db, departmentsTable, categoriesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Departments
  const departments = [
    { name: "Engineering", description: "Engineering and design team" },
    { name: "Manufacturing", description: "Production and manufacturing" },
    { name: "Quality Assurance", description: "QA and inspection team" },
    { name: "Maintenance", description: "Maintenance and facilities" },
    { name: "Safety", description: "Health, safety and environment" },
  ];

  for (const dept of departments) {
    const existing = await db.select().from(departmentsTable).where(eq(departmentsTable.name, dept.name));
    if (existing.length === 0) {
      await db.insert(departmentsTable).values(dept);
      console.log(`  Created department: ${dept.name}`);
    }
  }

  // Categories
  const categories = [
    { name: "Electrical Diagrams", description: "Electrical schematics and wiring diagrams" },
    { name: "Mechanical Drawings", description: "Engineering mechanical drawings" },
    { name: "Bill of Materials", description: "Parts lists and BOMs" },
    { name: "Work Instructions", description: "Standard operating procedures and work instructions" },
    { name: "Safety Procedures", description: "Safety and emergency procedures" },
    { name: "Quality Standards", description: "Quality control standards and procedures" },
    { name: "Maintenance Manuals", description: "Equipment maintenance manuals" },
  ];

  for (const cat of categories) {
    const existing = await db.select().from(categoriesTable).where(eq(categoriesTable.name, cat.name));
    if (existing.length === 0) {
      await db.insert(categoriesTable).values(cat);
      console.log(`  Created category: ${cat.name}`);
    }
  }

  // Default admin user
  const adminId = "ADMIN001";
  const existing = await db.select().from(usersTable).where(eq(usersTable.employeeId, adminId));
  if (existing.length === 0) {
    const passwordHash = await bcrypt.hash("Admin@1234", 10);
    await db.insert(usersTable).values({
      employeeId: adminId,
      fullName: "System Administrator",
      email: "admin@edocs.local",
      passwordHash,
      role: "administrator",
      status: "active",
      mustChangePassword: false,
    });
    console.log("  Created admin user: ADMIN001 / Admin@1234");
  }

  // Sample users for demo
  const sampleUsers = [
    { employeeId: "ENG001", fullName: "Jane Smith", email: "jane.smith@edocs.local", role: "engineer", password: "Password@123" },
    { employeeId: "SUP001", fullName: "Robert Chen", email: "robert.chen@edocs.local", role: "supervisor", password: "Password@123" },
    { employeeId: "DC001", fullName: "Maria Lopez", email: "maria.lopez@edocs.local", role: "document_controller", password: "Password@123" },
    { employeeId: "EMP001", fullName: "John Williams", email: "john.williams@edocs.local", role: "employee", password: "Password@123" },
    { employeeId: "INS001", fullName: "Sarah Johnson", email: "sarah.johnson@edocs.local", role: "inspector", password: "Password@123" },
  ];

  for (const u of sampleUsers) {
    const ex = await db.select().from(usersTable).where(eq(usersTable.employeeId, u.employeeId));
    if (ex.length === 0) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      await db.insert(usersTable).values({
        employeeId: u.employeeId,
        fullName: u.fullName,
        email: u.email,
        passwordHash,
        role: u.role,
        status: "active",
        mustChangePassword: false,
      });
      console.log(`  Created user: ${u.employeeId} (${u.role})`);
    }
  }

  console.log("\nSeed complete!");
  console.log("\nDefault credentials:");
  console.log("  Admin:              ADMIN001 / Admin@1234");
  console.log("  Engineer:           ENG001 / Password@123");
  console.log("  Supervisor:         SUP001 / Password@123");
  console.log("  Document Controller:DC001 / Password@123");
  console.log("  Employee:           EMP001 / Password@123");
  console.log("  Inspector:          INS001 / Password@123");

  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
