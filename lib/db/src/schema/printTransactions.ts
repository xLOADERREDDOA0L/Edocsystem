import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentsTable } from "./documents";
import { revisionsTable } from "./revisions";
import { usersTable } from "./users";

export const printTransactionsTable = pgTable("print_transactions", {
  id: serial("id").primaryKey(),
  transactionNumber: text("transaction_number").notNull().unique(),
  documentId: integer("document_id").notNull().references(() => documentsTable.id),
  revisionId: integer("revision_id").notNull().references(() => revisionsTable.id),
  employeeId: integer("employee_id").notNull().references(() => usersTable.id),
  copyNumber: text("copy_number").notNull(),
  numberOfCopies: integer("number_of_copies").notNull().default(1),
  qrToken: text("qr_token").notNull().unique(),
  status: text("status").notNull().default("completed"),
  purpose: text("purpose"),
  ipAddress: text("ip_address"),
  printedAt: timestamp("printed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPrintTransactionSchema = createInsertSchema(printTransactionsTable).omit({ id: true, printedAt: true });
export type InsertPrintTransaction = z.infer<typeof insertPrintTransactionSchema>;
export type PrintTransaction = typeof printTransactionsTable.$inferSelect;
