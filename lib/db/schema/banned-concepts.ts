import {
  pgTable,
  uuid,
  text,
  timestamp,
  vector,
} from "drizzle-orm/pg-core";
import { companies } from "./companies";

export const bannedConcepts = pgTable("banned_concepts", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  concept: text("concept").notNull(),
  category: text("category", {
    enum: ["competitor_bashing", "false_claims", "confidential", "inappropriate"],
  }).notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BannedConcept = typeof bannedConcepts.$inferSelect;
export type NewBannedConcept = typeof bannedConcepts.$inferInsert;
