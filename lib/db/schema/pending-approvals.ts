import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { conversations } from "./conversations";
import { companies } from "./companies";

export const pendingApprovals = pgTable("pending_approvals", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  toolName: text("tool_name").notNull(),
  toolInput: jsonb("tool_input").$type<Record<string, unknown>>().notNull(),
  agentType: text("agent_type", {
    enum: ["deal", "scheduler"],
  }).notNull(),
  status: text("status", {
    enum: ["pending", "approved", "denied"],
  })
    .default("pending")
    .notNull(),
  reviewerNote: text("reviewer_note"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PendingApproval = typeof pendingApprovals.$inferSelect;
export type NewPendingApproval = typeof pendingApprovals.$inferInsert;
