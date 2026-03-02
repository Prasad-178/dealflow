"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, Upload, Search, FileText, HelpCircle, BarChart } from "lucide-react";

type KBEntry = {
  id: string;
  title: string;
  sourceType: "product_doc" | "faq" | "case_study" | "pricing";
  content: string;
  updatedAt: string;
};

const knowledgeBase: KBEntry[] = [
  {
    id: "1",
    title: "Product Overview",
    sourceType: "product_doc",
    content: "DealFlow Pro is an AI-powered sales automation platform...",
    updatedAt: "2 days ago",
  },
  {
    id: "2",
    title: "AI Lead Scoring",
    sourceType: "product_doc",
    content: "Our AI scoring system evaluates leads based on...",
    updatedAt: "1 week ago",
  },
  {
    id: "3",
    title: "CRM Integration Guide",
    sourceType: "product_doc",
    content: "DealFlow Pro offers native integrations with Salesforce...",
    updatedAt: "3 days ago",
  },
  {
    id: "4",
    title: "General FAQ",
    sourceType: "faq",
    content: "How long does implementation take? Most teams are...",
    updatedAt: "1 week ago",
  },
  {
    id: "5",
    title: "TechCorp Case Study",
    sourceType: "case_study",
    content: "TechCorp increased demo bookings by 340%...",
    updatedAt: "2 weeks ago",
  },
  {
    id: "6",
    title: "Pricing Overview",
    sourceType: "pricing",
    content: "Starter plan at $49/month, Professional at $149/month...",
    updatedAt: "5 days ago",
  },
];

const sourceIcons: Record<string, typeof FileText> = {
  product_doc: FileText,
  faq: HelpCircle,
  case_study: BarChart,
  pricing: BarChart,
};

const sourceLabels: Record<string, string> = {
  product_doc: "Product Doc",
  faq: "FAQ",
  case_study: "Case Study",
  pricing: "Pricing",
};

const sourceAccents: Record<string, string> = {
  product_doc: "border-l-blue-500",
  faq: "border-l-green-500",
  case_study: "border-l-purple-500",
  pricing: "border-l-orange-500",
};

export default function KnowledgePage() {
  const [search, setSearch] = useState("");

  const filtered = knowledgeBase.filter(
    (entry) =>
      entry.title.toLowerCase().includes(search.toLowerCase()) ||
      entry.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">
            Manage product docs, FAQs, and case studies used by the AI agents
          </p>
        </div>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Object.entries(sourceLabels).map(([type, label]) => {
          const count = knowledgeBase.filter(
            (e) => e.sourceType === type
          ).length;
          const Icon = sourceIcons[type];
          return (
            <Card key={type}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{label}s</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search knowledge base..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Entries */}
      <div className="space-y-3">
        {filtered.map((entry) => {
          const Icon = sourceIcons[entry.sourceType];
          return (
            <Card key={entry.id} className={`border-l-4 ${sourceAccents[entry.sourceType]} hover:border-primary/50 transition-colors cursor-pointer`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{entry.title}</p>
                  <p className="text-sm text-muted-foreground truncate max-w-lg">
                    {entry.content}
                  </p>
                </div>
                <Badge variant="secondary">
                  {sourceLabels[entry.sourceType]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {entry.updatedAt}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
