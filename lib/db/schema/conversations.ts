import {
  pgTable,
  uuid,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { prospects } from "./prospects";
import { companies } from "./companies";

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  prospectId: uuid("prospect_id").references(() => prospects.id),
  status: text("status", {
    enum: ["idle", "processing", "cancelled"],
  })
    .default("idle")
    .notNull(),
  activeJobId: text("active_job_id"),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
