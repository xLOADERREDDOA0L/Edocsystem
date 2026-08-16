import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentsTable } from "./documents";
import { usersTable } from "./users";

export const revisionsTable = pgTable("document_revisions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documentsTable.id),
  revisionNumber: text("revision_number").notNull(),
  filePath: text("file_path"),
  fileName: text("file_name"),
  fileHash: text("file_hash"),
  status: text("status").notNull().default("draft"),
  effectiveDate: text("effective_date"),
  uploadedBy: integer("uploaded_by").references(() => usersTable.id),
  approvedBy: integer("approved_by").references(() => usersTable.id),
  approvalDate: timestamp("approval_date", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  approvalComments: text("approval_comments"),
  qrToken: text("qr_token").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRevisionSchema = createInsertSchema(revisionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRevision = z.infer<typeof insertRevisionSchema>;
export type Revision = typeof revisionsTable.$inferSelect;
