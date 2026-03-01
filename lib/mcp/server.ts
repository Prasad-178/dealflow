import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "dealflow-company-data",
  version: "1.0.0",
});

// Sample company data (in production, this would query DB)
const PRODUCTS = [
  {
    id: "prod_1",
    name: "DealFlow Pro",
    description: "AI-powered sales automation platform",
    features: [
      "Lead scoring & qualification",
      "Automated email sequences",
      "CRM integration",
      "Pipeline analytics",
      "AI chat assistant",
    ],
    pricingTiers: [
      {
        name: "Starter",
        price: 49,
        billingCycle: "monthly",
        features: ["Up to 500 leads", "Basic scoring", "Email integration", "Chat widget"],
      },
      {
        name: "Professional",
        price: 149,
        billingCycle: "monthly",
        features: [
          "Up to 5,000 leads",
          "Advanced AI scoring",
          "CRM sync",
          "Custom workflows",
          "Priority support",
        ],
      },
      {
        name: "Enterprise",
        price: 499,
        billingCycle: "monthly",
        features: [
          "Unlimited leads",
          "Custom AI models",
          "API access",
          "Dedicated CSM",
          "SLA guarantee",
          "SSO & SAML",
        ],
      },
    ],
  },
];

const DOCS = [
  {
    id: "doc_1",
    title: "Getting Started",
    content: "DealFlow Pro helps you automate your sales pipeline. Start by connecting your CRM, importing leads, and configuring your AI agent.",
  },
  {
    id: "doc_2",
    title: "Lead Scoring",
    content: "Our AI scoring system evaluates leads based on engagement, firmographics, and behavioral signals. Scores range from 0-100.",
  },
  {
    id: "doc_3",
    title: "Integration Guide",
    content: "DealFlow Pro integrates with Salesforce, HubSpot, Pipedrive, and any CRM via REST API. Setup takes under 15 minutes.",
  },
];

const CASE_STUDIES = [
  {
    id: "cs_1",
    industry: "SaaS",
    title: "How TechCorp increased demo bookings by 340%",
    content:
      "TechCorp, a 200-person SaaS company, implemented DealFlow Pro and saw demo bookings increase from 15/month to 66/month within 90 days. Their sales cycle shortened by 40% through automated qualification.",
  },
  {
    id: "cs_2",
    industry: "Financial Services",
    title: "FinanceHub saves 120 hours/month on lead qualification",
    content:
      "FinanceHub's sales team was spending 30+ hours per week manually qualifying leads. With DealFlow Pro's AI scoring, they automated 80% of qualification, freeing reps to focus on high-value conversations.",
  },
];

const TEAM = [
  { id: "team_1", name: "Sarah Chen", role: "Account Executive", available: true },
  { id: "team_2", name: "Mike Johnson", role: "Sales Engineer", available: true },
  { id: "team_3", name: "Lisa Park", role: "VP Sales", available: false },
];

// Tools
server.tool(
  "getProduct",
  "Get product details, features, and pricing tiers",
  { productId: z.string().optional() },
  async ({ productId }) => {
    const product = productId
      ? PRODUCTS.find((p) => p.id === productId)
      : PRODUCTS[0];
    return {
      content: [{ type: "text" as const, text: JSON.stringify(product, null, 2) }],
    };
  }
);

server.tool(
  "searchDocs",
  "Search product documentation and FAQs",
  { query: z.string() },
  async ({ query }) => {
    const queryLower = query.toLowerCase();
    const results = DOCS.filter(
      (d) =>
        d.title.toLowerCase().includes(queryLower) ||
        d.content.toLowerCase().includes(queryLower)
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
    };
  }
);

server.tool(
  "getCaseStudy",
  "Get case studies by industry",
  { industry: z.string() },
  async ({ industry }) => {
    const results = CASE_STUDIES.filter((cs) =>
      cs.industry.toLowerCase().includes(industry.toLowerCase())
    );
    return {
      content: [
        {
          type: "text" as const,
          text: results.length > 0
            ? JSON.stringify(results, null, 2)
            : "No case studies found for that industry.",
        },
      ],
    };
  }
);

server.tool(
  "getTeamAvailability",
  "Check team availability for meetings",
  {},
  async () => {
    return {
      content: [{ type: "text" as const, text: JSON.stringify(TEAM, null, 2) }],
    };
  }
);

server.tool(
  "getProspectHistory",
  "Get past interaction history with a prospect",
  { prospectId: z.string() },
  async ({ prospectId }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            prospectId,
            interactions: [],
            note: "No previous interactions found",
          }),
        },
      ],
    };
  }
);

// Resources
server.resource("products-catalog", "company://products/catalog", async (uri) => ({
  contents: [{ uri: uri.href, text: JSON.stringify(PRODUCTS, null, 2), mimeType: "application/json" }],
}));

server.resource("pricing-info", "company://pricing/all", async (uri) => ({
  contents: [
    {
      uri: uri.href,
      text: JSON.stringify(
        PRODUCTS.flatMap((p) => p.pricingTiers),
        null,
        2
      ),
      mimeType: "application/json",
    },
  ],
}));

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DealFlow MCP Server running on stdio");
}

main().catch(console.error);
