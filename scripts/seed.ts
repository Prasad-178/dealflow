import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import * as schema from "../lib/db/schema";

async function seed() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.log("⚠️  DATABASE_URL not set. Generating seed data preview only.\n");
    printSeedData();
    return;
  }

  const client = postgres(DATABASE_URL);
  const db = drizzle(client, { schema });

  console.log("🌱 Seeding database...\n");

  // Create demo company
  const [company] = await db
    .insert(schema.companies)
    .values({
      name: "DealFlow AI",
      description: "AI-powered sales automation platform that helps B2B teams close more deals faster.",
      website: "https://dealflow.ai",
      industry: "SaaS / Sales Tech",
      products: [
        {
          id: "prod_1",
          name: "DealFlow Pro",
          description: "Complete AI sales automation suite",
          features: [
            "AI Lead Scoring & Qualification",
            "Automated Email Sequences",
            "Smart CRM Integration",
            "Pipeline Analytics & Forecasting",
            "AI Chat Assistant for Websites",
            "Meeting Scheduling Automation",
            "Deal Intelligence & Insights",
          ],
          pricingTiers: [
            {
              name: "Starter",
              price: 49,
              billingCycle: "monthly" as const,
              features: [
                "Up to 500 leads/month",
                "Basic AI lead scoring",
                "Email integration",
                "Chat widget",
                "Standard support",
              ],
            },
            {
              name: "Professional",
              price: 149,
              billingCycle: "monthly" as const,
              features: [
                "Up to 5,000 leads/month",
                "Advanced AI scoring & qualification",
                "CRM sync (Salesforce, HubSpot)",
                "Custom workflows & automations",
                "Priority support",
                "Analytics dashboard",
              ],
            },
            {
              name: "Enterprise",
              price: 499,
              billingCycle: "monthly" as const,
              features: [
                "Unlimited leads",
                "Custom AI models",
                "Full API access",
                "Dedicated Customer Success Manager",
                "99.9% SLA guarantee",
                "SSO & SAML authentication",
                "Custom integrations",
                "On-premise deployment option",
              ],
            },
          ],
        },
      ],
      team: [
        {
          id: "team_1",
          name: "Sarah Chen",
          email: "sarah@dealflow.ai",
          role: "Account Executive",
          calendarId: "cal_sarah",
        },
        {
          id: "team_2",
          name: "Mike Johnson",
          email: "mike@dealflow.ai",
          role: "Sales Engineer",
          calendarId: "cal_mike",
        },
        {
          id: "team_3",
          name: "Lisa Park",
          email: "lisa@dealflow.ai",
          role: "VP of Sales",
        },
      ],
      guardrailConfig: {
        blockedTopics: [
          "internal salary information",
          "unreleased features not in roadmap",
          "competitor disparagement",
        ],
        maxDiscountPercent: 25,
        requireApprovalForProposals: true,
        requireApprovalForMeetings: true,
      },
    })
    .returning();

  console.log(`✅ Created company: ${company.name} (${company.id})`);

  // Create a demo prospect
  const [prospect] = await db
    .insert(schema.prospects)
    .values({
      companyId: company.id,
      name: "Alex Rivera",
      email: "alex@techstartup.io",
      company: "TechStartup Inc",
      role: "Head of Sales",
      qualificationScore: 0,
      tags: ["inbound", "website"],
    })
    .returning();

  console.log(`✅ Created prospect: ${prospect.name} (${prospect.id})`);

  // Create a conversation
  const [conversation] = await db
    .insert(schema.conversations)
    .values({
      companyId: company.id,
      prospectId: prospect.id,
      status: "idle",
    })
    .returning();

  console.log(`✅ Created conversation: ${conversation.id}`);

  // Seed product docs for RAG (embeddings would be generated when OPENAI_API_KEY is set)
  const docs = [
    {
      content: "DealFlow Pro is an AI-powered sales automation platform designed for B2B teams. It combines lead scoring, email automation, CRM integration, and an AI chat assistant to help sales teams close deals 3x faster. The platform uses advanced machine learning to score and qualify leads based on engagement patterns, firmographic data, and behavioral signals.",
      sourceType: "product_doc" as const,
      sourceId: "overview",
    },
    {
      content: "DealFlow Pro's AI Lead Scoring analyzes over 50 signals including website behavior, email engagement, company firmographics, and social media activity. Scores range from 0-100, with leads above 70 considered 'hot'. The system learns from your closed-won deals to continuously improve accuracy. Average customers see a 40% improvement in lead quality within 30 days.",
      sourceType: "product_doc" as const,
      sourceId: "lead-scoring",
    },
    {
      content: "CRM Integration: DealFlow Pro offers native integrations with Salesforce, HubSpot, and Pipedrive. Setup takes under 15 minutes. All lead data, scores, and conversation history sync bi-directionally in real-time. Custom field mapping is available on Professional and Enterprise plans. We also offer a REST API for custom CRM integrations.",
      sourceType: "product_doc" as const,
      sourceId: "integrations",
    },
    {
      content: "The AI Chat Assistant can be embedded on any website with a simple JavaScript snippet. It qualifies leads 24/7, answers product questions from your knowledge base, and books demos directly into your team's calendar. The assistant supports multiple languages and can be customized with your brand colors and personality.",
      sourceType: "product_doc" as const,
      sourceId: "chat-assistant",
    },
    {
      content: "Security & Compliance: DealFlow Pro is SOC 2 Type II certified and GDPR compliant. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Enterprise plans include SSO via SAML 2.0 and SCIM provisioning. We offer data residency options in US, EU, and APAC regions.",
      sourceType: "product_doc" as const,
      sourceId: "security",
    },
    {
      content: "FAQ: How long does implementation take? Most teams are fully set up within 1-2 days. Our onboarding team provides hands-on support during setup. What's the typical ROI? Customers report an average of 3x ROI within the first 90 days, primarily through increased demo bookings and shorter sales cycles. Do you offer a free trial? Yes, we offer a 14-day free trial of the Professional plan with no credit card required.",
      sourceType: "faq" as const,
      sourceId: "general-faq",
    },
    {
      content: "Case Study: TechCorp (SaaS, 200 employees) - Implemented DealFlow Pro and increased demo bookings from 15/month to 66/month within 90 days (340% increase). Sales cycle shortened by 40% through automated qualification. The team saved 25 hours/week on manual lead scoring. ROI: 5x within 6 months.",
      sourceType: "case_study" as const,
      sourceId: "techcorp",
    },
    {
      content: "Case Study: FinanceHub (Financial Services, 500 employees) - Deployed DealFlow Pro to automate lead qualification across 3 sales teams. Reduced time spent on unqualified leads by 80%. Increased qualified pipeline by 120%. The AI assistant handles 60% of initial prospect conversations without human intervention.",
      sourceType: "case_study" as const,
      sourceId: "financehub",
    },
    {
      content: "Pricing: Starter plan at $49/month includes up to 500 leads, basic AI scoring, email integration, and chat widget. Professional plan at $149/month adds advanced AI, CRM sync, custom workflows, and priority support for up to 5,000 leads. Enterprise plan at $499/month offers unlimited leads, custom AI models, API access, dedicated CSM, and SLA guarantee. Annual billing saves 20%.",
      sourceType: "pricing" as const,
      sourceId: "pricing-overview",
    },
  ];

  for (const doc of docs) {
    await db.insert(schema.embeddings).values({
      companyId: company.id,
      content: doc.content,
      sourceType: doc.sourceType,
      sourceId: doc.sourceId,
      chunkIndex: 0,
      // Embeddings would be generated when OPENAI_API_KEY is available
      embedding: null,
    });
  }

  console.log(`✅ Seeded ${docs.length} knowledge base documents`);

  // Seed banned concepts
  const bannedConceptsList = [
    { concept: "Our competitor's product is terrible and unreliable", category: "competitor_bashing" as const },
    { concept: "I guarantee you'll see 10x revenue increase", category: "false_claims" as const },
    { concept: "Our internal profit margins on this deal", category: "confidential" as const },
    { concept: "We can build any custom feature you want for free", category: "false_claims" as const },
  ];

  for (const bc of bannedConceptsList) {
    await db.insert(schema.bannedConcepts).values({
      companyId: company.id,
      concept: bc.concept,
      category: bc.category,
      embedding: null,
    });
  }

  console.log(`✅ Seeded ${bannedConceptsList.length} banned concepts`);

  // Create demo user (idempotent — skip if already exists)
  const passwordHash = await hash("password123", 12);
  const existingUsers = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, "demo@dealflow.ai"))
    .limit(1);

  if (existingUsers.length > 0) {
    console.log(`✅ Demo user already exists: ${existingUsers[0].email}`);
  } else {
    const [user] = await db
      .insert(schema.users)
      .values({
        email: "demo@dealflow.ai",
        passwordHash,
        name: "Demo User",
        companyId: company.id,
        role: "admin",
      })
      .returning();

    console.log(`✅ Created demo user: ${user.email} (password: password123)`);
  }

  console.log("\n🎉 Seed complete!");
  console.log(`\n📋 Company ID: ${company.id}`);
  console.log(`   Use this ID in chat URL: /chat/${company.id}`);
  console.log(`   Login: demo@dealflow.ai / password123`);

  await client.end();
}

function printSeedData() {
  console.log("📋 Seed Data Preview:\n");
  console.log("Company: DealFlow AI");
  console.log("Product: DealFlow Pro");
  console.log("Pricing: Starter ($49), Professional ($149), Enterprise ($499)");
  console.log("Docs: 9 knowledge base entries (product docs, FAQs, case studies, pricing)");
  console.log("Banned concepts: 4 guardrail entries");
  console.log("\nTo seed the database, set DATABASE_URL in .env and run: npm run seed");
}

seed().catch(console.error);
