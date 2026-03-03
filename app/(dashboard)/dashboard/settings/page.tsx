"use client";

import { useState, useEffect } from "react";
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
import {
  Shield,
  DollarSign,
  Users,
  Plug,
  Mail,
  MessageSquare,
  Send,
  Calendar,
  CheckCircle,
} from "lucide-react";

export default function SettingsPage() {
  const [maxDiscount, setMaxDiscount] = useState("25");
  const [blockedTopics, setBlockedTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [requireApprovalForProposals, setRequireApprovalForProposals] = useState(true);
  const [requireApprovalForMeetings, setRequireApprovalForMeetings] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((config) => {
        if (config && !config.error) {
          setBlockedTopics(config.blockedTopics || []);
          setMaxDiscount(String(config.maxDiscountPercent || 25));
          setRequireApprovalForProposals(config.requireApprovalForProposals ?? true);
          setRequireApprovalForMeetings(config.requireApprovalForMeetings ?? true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function addTopic() {
    if (newTopic.trim()) {
      setBlockedTopics((prev) => [...prev, newTopic.trim()]);
      setNewTopic("");
    }
  }

  function removeTopic(index: number) {
    setBlockedTopics((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockedTopics,
          maxDiscountPercent: parseInt(maxDiscount) || 25,
          requireApprovalForProposals,
          requireApprovalForMeetings,
        }),
      });
      if (res.ok) {
        setFeedback({ type: "success", message: "Settings saved successfully" });
      } else {
        setFeedback({ type: "error", message: "Failed to save settings" });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to save settings" });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  }

  const discountNum = parseInt(maxDiscount) || 25;

  if (loading) {
    return (
      <div className="p-8 max-w-4xl">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure guardrails, pricing rules, and agent behavior
        </p>
      </div>

      {feedback && (
        <div
          className={`mb-6 p-3 rounded-lg text-sm ${
            feedback.type === "success"
              ? "bg-green-500/10 text-green-400"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {feedback.type === "success" && <CheckCircle className="inline h-4 w-4 mr-2" />}
          {feedback.message}
        </div>
      )}

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
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm">0-10%: Auto-approved</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">
                    11-{maxDiscount}%: Requires approval
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm">
                    {">"}{maxDiscount}%: Blocked
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                <div
                  className="bg-green-500 h-full"
                  style={{ width: `${(10 / 50) * 100}%` }}
                />
                <div
                  className="bg-yellow-500 h-full"
                  style={{ width: `${((discountNum - 10) / 50) * 100}%` }}
                />
                <div
                  className="bg-red-500 h-full"
                  style={{ width: `${((50 - discountNum) / 50) * 100}%` }}
                />
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
                  required: requireApprovalForProposals,
                },
                {
                  action: "Book Meeting",
                  description: "Scheduling demos and meetings",
                  required: requireApprovalForMeetings,
                },
                {
                  action: "Apply Large Discount",
                  description: "Discounts exceeding 10%",
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
                  className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50"
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

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-primary" />
              Integrations
            </CardTitle>
            <CardDescription>
              Platform connections for inbound/outbound messaging and calendar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  name: "Email (Resend)",
                  icon: Mail,
                  configured: !!(
                    process.env.NEXT_PUBLIC_RESEND_CONFIGURED === "true"
                  ),
                  description: "Receive and reply to inbound emails",
                },
                {
                  name: "Slack",
                  icon: MessageSquare,
                  configured: !!(
                    process.env.NEXT_PUBLIC_SLACK_CONFIGURED === "true"
                  ),
                  description: "Respond to Slack messages via Events API",
                },
                {
                  name: "Telegram",
                  icon: Send,
                  configured: !!(
                    process.env.NEXT_PUBLIC_TELEGRAM_CONFIGURED === "true"
                  ),
                  description: "Respond to Telegram bot messages",
                },
                {
                  name: "Google Calendar",
                  icon: Calendar,
                  configured: !!(
                    process.env.NEXT_PUBLIC_CALENDAR_CONFIGURED === "true"
                  ),
                  description:
                    "Real availability checks and meeting creation with Google Meet",
                },
              ].map((integration) => (
                <div
                  key={integration.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <integration.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{integration.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {integration.description}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={integration.configured ? "default" : "secondary"}
                  >
                    {integration.configured ? "Connected" : "Not configured"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
