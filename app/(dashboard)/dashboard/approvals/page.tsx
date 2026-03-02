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
import { CheckCircle, XCircle, Clock, Eye } from "lucide-react";

type Approval = {
  id: string;
  toolName: string;
  agentType: string;
  status: "pending" | "approved" | "denied";
  toolInput: Record<string, unknown>;
  createdAt: string;
  context: string;
};

const mockApprovals: Approval[] = [
  {
    id: "1",
    toolName: "sendProposal",
    agentType: "deal",
    status: "pending",
    toolInput: {
      prospectName: "Alex Rivera",
      selectedTier: "Professional",
      discountPercent: 15,
      notes: "Multi-year commitment, switching from competitor",
    },
    createdAt: new Date().toISOString(),
    context:
      "Prospect is VP of Sales at 200-person company. Expressed strong interest in Professional tier but requested 15% discount for annual commitment.",
  },
  {
    id: "2",
    toolName: "bookMeeting",
    agentType: "scheduler",
    status: "pending",
    toolInput: {
      date: "2026-03-05",
      time: "2:00 PM ET",
      duration: "30",
      meetingType: "demo",
      prospectName: "Jordan Lee",
      prospectEmail: "jordan@financehub.com",
    },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    context:
      "Prospect from FinanceHub wants to see a live demo. Team of 20 sales reps. Currently evaluating 3 solutions.",
  },
  {
    id: "3",
    toolName: "applyDiscount",
    agentType: "deal",
    status: "approved",
    toolInput: {
      discountPercent: 20,
      reason: "Enterprise deal, 3-year commitment",
      tier: "Enterprise",
    },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    context: "Large enterprise prospect committing to 3-year deal worth $14,400/yr.",
  },
];

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState(mockApprovals);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleApproval(id: string, status: "approved" | "denied") {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
  }

  const pending = approvals.filter((a) => a.status === "pending");
  const resolved = approvals.filter((a) => a.status !== "pending");

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Approvals</h1>
        <p className="text-muted-foreground mt-1">
          Review and approve agent actions that require human oversight
        </p>
      </div>

      {/* Pending */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-500" />
          Pending Approval ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No pending approvals. All agent actions are up to date.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pending.map((approval) => (
              <Card key={approval.id} className="border-l-4 border-l-yellow-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="warning">{approval.agentType}</Badge>
                      <CardTitle className="text-lg">
                        {approval.toolName === "sendProposal"
                          ? "Send Proposal"
                          : approval.toolName === "bookMeeting"
                            ? "Book Meeting"
                            : approval.toolName === "applyDiscount"
                              ? "Apply Discount"
                              : approval.toolName}
                      </CardTitle>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(approval.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <CardDescription>{approval.context}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg p-4 mb-4 font-mono text-sm">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(approval.toolInput, null, 2)}
                    </pre>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApproval(approval.id, "approved")}
                      className="bg-green-600 hover:bg-green-500"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleApproval(approval.id, "denied")}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Deny
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setExpandedId(
                          expandedId === approval.id ? null : approval.id
                        )
                      }
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Full Context
                    </Button>
                  </div>
                  {expandedId === approval.id && (
                    <div className="mt-4 p-4 bg-muted border border-border/50 rounded-lg">
                      <h4 className="font-medium mb-2">Full Conversation Context</h4>
                      <p className="text-sm text-muted-foreground">
                        {approval.context}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Resolved */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Resolved ({resolved.length})
        </h2>
        <div className="space-y-3">
          {resolved.map((approval) => (
            <Card key={approval.id} className="opacity-75">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      approval.status === "approved" ? "success" : "destructive"
                    }
                  >
                    {approval.status}
                  </Badge>
                  <span className="font-medium">{approval.toolName}</span>
                  <span className="text-sm text-muted-foreground">
                    {approval.agentType} agent
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(approval.createdAt).toLocaleString()}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
