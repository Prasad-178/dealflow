import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sparkles,
  Bot,
  Shield,
  Brain,
  Calendar,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Zap,
  Users,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Multi-Agent Orchestration",
    description:
      "Supervisor agent classifies intent and routes to specialized sub-agents: Qualifier, Knowledge, Deal, and Scheduler.",
  },
  {
    icon: Shield,
    title: "3-Layer Guardrails",
    description:
      "Deterministic regex rules, semantic similarity filtering, and LLM post-generation checks ensure safe, professional responses.",
  },
  {
    icon: Brain,
    title: "Persistent Memory",
    description:
      "Extracts prospect facts from conversations, consolidates with LLM judge, and injects relevant context into future interactions.",
  },
  {
    icon: CheckCircle,
    title: "Human-in-the-Loop",
    description:
      "High-stakes actions like proposals, large discounts, and meeting bookings require human approval before execution.",
  },
  {
    icon: Zap,
    title: "RAG Knowledge Base",
    description:
      "Vector search over product docs, FAQs, and case studies ensures accurate, grounded answers to prospect questions.",
  },
  {
    icon: Calendar,
    title: "MCP Integration",
    description:
      "Model Context Protocol server exposes company data through standardized tools and resources.",
  },
];

const agents = [
  {
    name: "QualifierAgent",
    description: "Qualifies leads using BANT methodology",
    tools: ["scoreLeadFit", "getCompanyInfo", "tagLead"],
    hitl: false,
  },
  {
    name: "KnowledgeAgent",
    description: "RAG over product docs and case studies",
    tools: ["searchKnowledgeBase", "getCaseStudy"],
    hitl: false,
  },
  {
    name: "DealAgent",
    description: "Pricing discussions and proposal drafting",
    tools: ["getPricing", "draftProposal", "applyDiscount"],
    hitl: true,
  },
  {
    name: "SchedulerAgent",
    description: "Demo and meeting booking",
    tools: ["checkAvailability", "bookMeeting"],
    hitl: true,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Nav */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-xl">DealFlow AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Link href="/chat/demo">
              <Button>Try Chat Demo</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
          <Sparkles className="h-4 w-4" />
          Autonomous Business Development Agent
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          AI That Closes Deals
          <br />
          <span className="text-primary">While You Sleep</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          A multi-agent AI system that qualifies leads, answers product
          questions, negotiates deals, and books meetings - with human approval
          for high-stakes decisions.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/chat/demo">
            <Button size="lg" className="h-12 px-8">
              Try Live Demo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="h-12 px-8">
              View Dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Architecture */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Architecture Overview</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Built with a supervisor pattern that classifies intent and routes to
            specialized sub-agents, each with their own tools and HITL rules
          </p>
        </div>

        {/* Architecture diagram */}
        <Card className="mb-12 overflow-hidden">
          <CardContent className="p-8">
            <pre className="text-sm font-mono text-center text-slate-600 overflow-x-auto">
{`Prospect (Chat)  →  /api/chat  →  Guardrails (Pre)  →  Supervisor Agent
                                                              ↓
                                         ┌──────────┬──────────┬──────────┐
                                    Qualifier   Deal    Scheduler   Knowledge
                                    Agent       Agent   Agent       Agent
                                         └──────────┴──────────┴──────────┘
                                                              ↓
                                                    Guardrails (Post)  →  Response
                                                              ↓
                                                 Background: Memory Extraction`}
            </pre>
          </CardContent>
        </Card>

        {/* Agents grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <Card key={agent.name}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                  {agent.hitl ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                      HITL Required
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">
                      Autonomous
                    </span>
                  )}
                </div>
                <CardDescription>{agent.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {agent.tools.map((tool) => (
                    <code
                      key={tool}
                      className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700"
                    >
                      {tool}()
                    </code>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">
            All 7 Architecture Modules
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Demonstrates messaging, state management, tool calling, memory,
            multi-agent orchestration, guardrails, and evaluation
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="border-0 shadow-md">
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3">Tech Stack</h2>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {[
            "Next.js 15",
            "React 19",
            "Vercel AI SDK v4",
            "PostgreSQL + pgvector",
            "Drizzle ORM",
            "OpenAI GPT-4o-mini",
            "MCP Protocol",
            "Inngest",
            "shadcn/ui",
            "Tailwind CSS",
          ].map((tech) => (
            <span
              key={tech}
              className="px-4 py-2 rounded-full bg-white border text-sm font-medium"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>
            DealFlow AI - Multi-Agent Business Development Platform
          </p>
          <p className="mt-1">
            Built to demonstrate agentic AI architecture patterns
          </p>
        </div>
      </footer>
    </div>
  );
}
