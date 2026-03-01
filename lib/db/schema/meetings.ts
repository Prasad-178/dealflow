import {
  pgTable,
  uuid,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { prospects } from "./prospects";
import { companies } from "./companies";
import { conversations } from "./conversations";

export const meetings = pgTable("meetings", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  prospectId: uuid("prospect_id")
    .references(() => prospects.id)
    .notNull(),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  attendees: text("attendees").array(),
  meetingLink: text("meeting_link"),
  status: text("status", {
    enum: ["scheduled", "completed", "cancelled"],
  })
    .default("scheduled")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;
