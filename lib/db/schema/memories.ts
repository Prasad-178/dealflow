import {
  pgTable,
  uuid,
  text,
  real,
  timestamp,
  vector,
} from "drizzle-orm/pg-core";
import { prospects } from "./prospects";

export const memories = pgTable("memories", {
  id: uuid("id").defaultRandom().primaryKey(),
  prospectId: uuid("prospect_id")
    .references(() => prospects.id, { onDelete: "cascade" })
    .notNull(),
  fact: text("fact").notNull(),
  category: text("category", {
    enum: ["budget", "timeline", "needs", "objection", "preference", "context"],
  }).notNull(),
  confidence: real("confidence").default(1.0).notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  sourceConversationId: uuid("source_conversation_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
