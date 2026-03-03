"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  MessageSquare,
  Target,
  Calendar,
} from "lucide-react";

type Stats = {
  leads: number;
  avgQualificationScore: number;
  pendingApprovals: number;
  meetings: number;
  recentConversations: {
    conversationId: string;
    prospectName: string | null;
    prospectCompany: string | null;
    prospectScore: number | null;
    lastMessage: string;
    agentType: string;
    updatedAt: string;
  }[];
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      label: "Active Leads",
      value: stats?.leads ?? "-",
      icon: Users,
      accent: "border-t-primary",
    },
    {
      label: "Avg. Qualification Score",
      value: stats?.avgQualificationScore ?? "-",
      icon: Target,
      accent: "border-t-green-500",
    },
    {
      label: "Pending Approvals",
      value: stats?.pendingApprovals ?? "-",
      icon: Clock,
      accent: "border-t-yellow-500",
    },
    {
      label: "Meetings",
      value: stats?.meetings ?? "-",
      icon: Calendar,
      accent: "border-t-purple-500",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your sales pipeline and agent activity
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.label} className={`border-t-2 ${stat.accent}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">
                    {loading ? "..." : stat.value}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Conversations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Recent Conversations</CardTitle>
          <CardDescription>
            Latest prospect interactions handled by AI agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : !stats?.recentConversations?.length ? (
            <p className="text-muted-foreground text-sm">
              No conversations yet. Start chatting to see activity here.
            </p>
          ) : (
            <div className="space-y-4">
              {stats.recentConversations.map((conv) => (
                <div
                  key={conv.conversationId}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border/50 hover:bg-accent transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {conv.prospectName || "Unknown Prospect"}
                      </p>
                      {conv.prospectCompany && (
                        <span className="text-sm text-muted-foreground">
                          {conv.prospectCompany}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage || "No messages"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      conv.agentType === "deal"
                        ? "default"
                        : conv.agentType === "knowledge"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {conv.agentType}
                  </Badge>
                  <div className="text-right">
                    {conv.prospectScore != null && (
                      <div className="flex items-center gap-1">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            conv.prospectScore >= 70
                              ? "bg-green-500"
                              : conv.prospectScore >= 40
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                        />
                        <span className="text-sm font-medium">
                          {conv.prospectScore}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
