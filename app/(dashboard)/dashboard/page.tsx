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
  Mail,
  Send,
  Globe,
} from "lucide-react";

const stats = [
  {
    label: "Active Leads",
    value: "47",
    change: "+12%",
    icon: Users,
    accent: "border-t-primary",
  },
  {
    label: "Qualification Rate",
    value: "68%",
    change: "+5%",
    icon: Target,
    accent: "border-t-green-500",
  },
  {
    label: "Pending Approvals",
    value: "3",
    change: "",
    icon: Clock,
    accent: "border-t-yellow-500",
  },
  {
    label: "Deals Closed",
    value: "12",
    change: "+18%",
    icon: TrendingUp,
    accent: "border-t-purple-500",
  },
];

const platformConfig: Record<string, { icon: typeof MessageSquare; label: string }> = {
  widget: { icon: Globe, label: "Widget" },
  email: { icon: Mail, label: "Email" },
  slack: { icon: MessageSquare, label: "Slack" },
  telegram: { icon: Send, label: "Telegram" },
  api: { icon: Globe, label: "API" },
};

const recentConversations = [
  {
    prospect: "Alex Rivera",
    company: "TechStartup Inc",
    lastMessage: "Can you tell me more about the Enterprise plan?",
    agent: "deal",
    platform: "widget",
    time: "2 min ago",
    score: 85,
  },
  {
    prospect: "Jordan Lee",
    company: "FinanceHub",
    lastMessage: "We need something that integrates with Salesforce",
    agent: "knowledge",
    platform: "slack",
    time: "15 min ago",
    score: 72,
  },
  {
    prospect: "Sam Taylor",
    company: "StartupXYZ",
    lastMessage: "What's your pricing for a team of 10?",
    agent: "qualifier",
    platform: "email",
    time: "1 hr ago",
    score: 45,
  },
];

export default function DashboardPage() {
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
        {stats.map((stat) => (
          <Card key={stat.label} className={`border-t-2 ${stat.accent}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  {stat.change && (
                    <p className="text-sm text-green-400 mt-1">{stat.change} this week</p>
                  )}
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
          <CardDescription>Latest prospect interactions handled by AI agents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentConversations.map((conv, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-lg border border-border/50 hover:bg-accent transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{conv.prospect}</p>
                    <span className="text-sm text-muted-foreground">
                      {conv.company}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.lastMessage}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const pConfig = platformConfig[conv.platform] || platformConfig.widget;
                    const PlatformIcon = pConfig.icon;
                    return (
                      <Badge variant="outline" className="gap-1">
                        <PlatformIcon className="h-3 w-3" />
                        {pConfig.label}
                      </Badge>
                    );
                  })()}
                  <Badge
                    variant={
                      conv.agent === "deal"
                        ? "default"
                        : conv.agent === "knowledge"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {conv.agent}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        conv.score >= 70
                          ? "bg-green-500"
                          : conv.score >= 40
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                    />
                    <span className="text-sm font-medium">{conv.score}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{conv.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
