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
    accent: "border-l-green-500",
  },
  {
    name: "KnowledgeAgent",
    description: "RAG over product docs and case studies",
    tools: ["searchKnowledgeBase", "getCaseStudy"],
    hitl: false,
    accent: "border-l-blue-500",
  },
  {
    name: "DealAgent",
    description: "Pricing discussions and proposal drafting",
    tools: ["getPricing", "draftProposal", "applyDiscount"],
    hitl: true,
    accent: "border-l-purple-500",
  },
  {
    name: "SchedulerAgent",
    description: "Demo and meeting booking",
    tools: ["checkAvailability", "bookMeeting"],
    hitl: true,
    accent: "border-l-orange-500",
  },
];

function FlowBox({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "primary" | "highlight";
}) {
  const styles = {
    default: "bg-muted border-border/50 text-foreground",
    primary: "bg-primary/10 border-primary/30 text-primary",
    highlight: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  };
  return (
    <div
      className={`px-4 py-2.5 rounded-lg border text-sm font-medium text-center ${styles[variant]}`}
    >
      {children}
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center text-muted-foreground">
      <ArrowRight className="h-4 w-4" />
    </div>
  );
}

function FlowArrowDown() {
  return (
    <div className="flex items-center justify-center text-muted-foreground py-1">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50">
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
      <section className="relative max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
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
              <Button size="lg" className="h-12 px-8 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
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

        {/* Architecture diagram - styled flow boxes */}
        <div className="border border-border/50 rounded-xl p-8 mb-12 bg-card/50">
          {/* Row 1: Input flow */}
          <div className="flex items-center justify-center gap-3 flex-wrap mb-4">
            <FlowBox>Prospect (Chat)</FlowBox>
            <FlowArrow />
            <FlowBox>/api/chat</FlowBox>
            <FlowArrow />
            <FlowBox variant="highlight">Guardrails (Pre)</FlowBox>
            <FlowArrow />
            <FlowBox variant="primary">Supervisor Agent</FlowBox>
          </div>

          <FlowArrowDown />

          {/* Row 2: Sub-agents */}
          <div className="flex items-center justify-center gap-3 flex-wrap mb-4">
            <FlowBox>Qualifier Agent</FlowBox>
            <FlowBox>Deal Agent</FlowBox>
            <FlowBox>Scheduler Agent</FlowBox>
            <FlowBox>Knowledge Agent</FlowBox>
          </div>

          <FlowArrowDown />

          {/* Row 3: Output flow */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <FlowBox variant="highlight">Guardrails (Post)</FlowBox>
            <FlowArrow />
            <FlowBox>Response</FlowBox>
            <span className="text-muted-foreground mx-2">|</span>
            <FlowBox>Memory Extraction</FlowBox>
          </div>
        </div>

        {/* Agents grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <Card key={agent.name} className={`border-l-4 ${agent.accent}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                  {agent.hitl ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/15 text-yellow-400 font-medium">
                      HITL Required
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/15 text-green-400 font-medium">
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
                      className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground"
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
            <Card key={feature.title} className="border border-border/50 hover:border-primary/30 transition-colors">
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
              className="px-4 py-2 rounded-full bg-muted border border-border/50 text-sm font-medium"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card py-8">
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
