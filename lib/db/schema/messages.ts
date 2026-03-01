import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { conversations } from "./conversations";

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role", {
    enum: ["user", "assistant", "system", "tool"],
  }).notNull(),
  content: text("content"),
  toolCalls: jsonb("tool_calls").$type<
    {
      id: string;
      name: string;
      arguments: Record<string, unknown>;
    }[]
  >(),
  toolCallId: text("tool_call_id"),
  agentType: text("agent_type", {
    enum: ["supervisor", "qualifier", "deal", "scheduler", "knowledge"],
  }),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
