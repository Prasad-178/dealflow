import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  vector,
} from "drizzle-orm/pg-core";
import { companies } from "./companies";

export const embeddings = pgTable("embeddings", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content").notNull(),
  sourceType: text("source_type", {
    enum: ["product_doc", "faq", "case_study", "pricing"],
  }).notNull(),
  sourceId: text("source_id"),
  chunkIndex: integer("chunk_index").default(0),
  embedding: vector("embedding", { dimensions: 1536 }),
  metadata: text("metadata_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;
