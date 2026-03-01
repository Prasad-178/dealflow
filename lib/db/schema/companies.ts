import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  website: text("website"),
  industry: text("industry"),
  products: jsonb("products").$type<
    {
      id: string;
      name: string;
      description: string;
      features: string[];
      pricingTiers: {
        name: string;
        price: number;
        billingCycle: "monthly" | "yearly";
        features: string[];
      }[];
    }[]
  >(),
  team: jsonb("team").$type<
    {
      id: string;
      name: string;
      email: string;
      role: string;
      calendarId?: string;
    }[]
  >(),
  guardrailConfig: jsonb("guardrail_config").$type<{
    blockedTopics: string[];
    maxDiscountPercent: number;
    requireApprovalForProposals: boolean;
    requireApprovalForMeetings: boolean;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
