"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Eye, Video, Loader2 } from "lucide-react";

type Approval = {
  id: string;
  toolName: string;
  agentType: string;
  status: "pending" | "approved" | "denied";
  toolInput: Record<string, unknown>;
  createdAt: string;
  conversationId: string;
  prospectName: string | null;
  prospectCompany: string | null;
  reviewerNote: string | null;
  reviewedAt: string | null;
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [meetLinks, setMeetLinks] = useState<Record<string, string>>({});

  function fetchApprovals() {
    setLoading(true);
    fetch("/api/approvals")
      .then((r) => r.json())
      .then((data) => {
        setApprovals(data.approvals || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchApprovals();
  }, []);

  async function handleApproval(id: string, status: "approved" | "denied") {
    // Optimistic update
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );

    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.meetingLink) {
        setMeetLinks((prev) => ({ ...prev, [id]: data.meetingLink }));
      }
    } catch {
      // Revert on error
      fetchApprovals();
    }
  }

  const pending = approvals.filter((a) => a.status === "pending");
  const resolved = approvals.filter((a) => a.status !== "pending");

  const toolLabel = (name: string) => {
    switch (name) {
      case "sendProposal": return "Send Proposal";
      case "bookMeeting": return "Book Meeting";
      case "applyDiscount": return "Apply Discount";
      default: return name;
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                        {toolLabel(approval.toolName)}
                      </CardTitle>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(approval.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <CardDescription>
                    {approval.prospectName && (
                      <span>
                        {approval.prospectName}
                        {approval.prospectCompany && ` at ${approval.prospectCompany}`}
                        {" — "}
                      </span>
                    )}
                    {approval.toolName} request from {approval.agentType} agent
                  </CardDescription>
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
                      Details
                    </Button>
                  </div>
                  {expandedId === approval.id && (
                    <div className="mt-4 p-4 bg-muted border border-border/50 rounded-lg text-sm space-y-1">
                      <p><strong>Conversation:</strong> {approval.conversationId}</p>
                      {approval.prospectName && (
                        <p><strong>Prospect:</strong> {approval.prospectName}</p>
                      )}
                      {approval.prospectCompany && (
                        <p><strong>Company:</strong> {approval.prospectCompany}</p>
                      )}
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
        {resolved.length === 0 ? (
          <p className="text-sm text-muted-foreground">No resolved approvals yet.</p>
        ) : (
          <div className="space-y-3">
            {resolved.map((approval) => (
              <Card key={approval.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          approval.status === "approved" ? "success" : "destructive"
                        }
                      >
                        {approval.status}
                      </Badge>
                      <span className="font-medium">{toolLabel(approval.toolName)}</span>
                      <span className="text-sm text-muted-foreground">
                        {approval.agentType} agent
                        {approval.prospectName && ` — ${approval.prospectName}`}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(approval.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {approval.status === "approved" &&
                    approval.toolName === "bookMeeting" &&
                    meetLinks[approval.id] && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                        <Video className="h-4 w-4" />
                        <span>Calendar event created</span>
                        <a
                          href={meetLinks[approval.id]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          Join Google Meet
                        </a>
                      </div>
                    )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
