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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, DollarSign, Users, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const [maxDiscount, setMaxDiscount] = useState("25");
  const [blockedTopics, setBlockedTopics] = useState([
    "Internal salary information",
    "Unreleased features not in roadmap",
    "Competitor disparagement",
  ]);
  const [newTopic, setNewTopic] = useState("");

  function addTopic() {
    if (newTopic.trim()) {
      setBlockedTopics((prev) => [...prev, newTopic.trim()]);
      setNewTopic("");
    }
  }

  function removeTopic(index: number) {
    setBlockedTopics((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure guardrails, pricing rules, and agent behavior
        </p>
      </div>

      <div className="space-y-6">
        {/* Guardrail Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Guardrail Configuration
            </CardTitle>
            <CardDescription>
              Define rules that prevent the AI agents from sharing sensitive
              information or making unauthorized commitments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Blocked Topics
              </label>
              <p className="text-sm text-muted-foreground mb-3">
                The AI will not discuss these topics and will redirect the
                conversation
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {blockedTopics.map((topic, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeTopic(i)}
                  >
                    {topic} &times;
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Add a blocked topic..."
                  onKeyDown={(e) => e.key === "Enter" && addTopic()}
                />
                <Button variant="outline" onClick={addTopic}>
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Pricing & Discount Rules
            </CardTitle>
            <CardDescription>
              Configure automatic approval thresholds for discounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Maximum Auto-Approved Discount
              </label>
              <p className="text-sm text-muted-foreground mb-3">
                Discounts up to 10% are auto-approved. Discounts above this
                require human approval. Maximum allowed discount:
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  className="w-24"
                  min="0"
                  max="50"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm">0-10%: Auto-approved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="text-sm">11-{maxDiscount}%: Requires approval</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm">{">"}
                  {maxDiscount}%: Blocked</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HITL Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Human-in-the-Loop (HITL) Rules
            </CardTitle>
            <CardDescription>
              Configure which actions always require human approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  action: "Send Proposal",
                  description: "Sending pricing proposals to prospects",
                  required: true,
                },
                {
                  action: "Book Meeting",
                  description: "Scheduling demos and meetings",
                  required: true,
                },
                {
                  action: "Apply Large Discount",
                  description: "Discounts exceeding 10%",
                  required: true,
                },
                {
                  action: "Escalate to Sales Team",
                  description: "Transferring conversation to a human",
                  required: true,
                },
                {
                  action: "Qualify a Lead",
                  description: "Scoring and tagging leads",
                  required: false,
                },
                {
                  action: "Answer Product Questions",
                  description: "Responding with RAG-powered answers",
                  required: false,
                },
              ].map((rule) => (
                <div
                  key={rule.action}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{rule.action}</p>
                    <p className="text-sm text-muted-foreground">
                      {rule.description}
                    </p>
                  </div>
                  <Badge variant={rule.required ? "default" : "secondary"}>
                    {rule.required ? "Approval Required" : "Autonomous"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}
