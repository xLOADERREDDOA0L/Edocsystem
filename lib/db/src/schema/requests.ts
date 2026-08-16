import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentsTable } from "./documents";
import { revisionsTable } from "./revisions";
import { usersTable } from "./users";

export const documentRequestsTable = pgTable("document_requests", {
  id: serial("id").primaryKey(),
  requestNumber: text("request_number").notNull().unique(),
  documentId: integer("document_id").notNull().references(() => documentsTable.id),
  revisionId: integer("revision_id").references(() => revisionsTable.id),
  requestedBy: integer("requested_by").notNull().references(() => usersTable.id),
  purpose: text("purpose"),
  numberOfCopies: integer("number_of_copies").notNull().default(1),
  status: text("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
});

export const insertDocumentRequestSchema = createInsertSchema(documentRequestsTable).omit({ id: true, requestedAt: true, approvedAt: true });
export type InsertDocumentRequest = z.infer<typeof insertDocumentRequestSchema>;
export type DocumentRequest = typeof documentRequestsTable.$inferSelect;
