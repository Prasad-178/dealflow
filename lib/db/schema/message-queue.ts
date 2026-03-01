import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const messageQueue = pgTable("message_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  platform: text("platform", {
    enum: ["slack", "email", "widget", "api"],
  }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  status: text("status", {
    enum: ["pending", "processing", "completed", "failed"],
  })
    .default("pending")
    .notNull(),
  error: text("error"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MessageQueueItem = typeof messageQueue.$inferSelect;
export type NewMessageQueueItem = typeof messageQueue.$inferInsert;
