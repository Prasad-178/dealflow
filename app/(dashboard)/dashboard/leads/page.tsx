import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRight } from "lucide-react";

const leads = [
  {
    name: "Alex Rivera",
    company: "TechStartup Inc",
    email: "alex@techstartup.io",
    role: "Head of Sales",
    score: 85,
    tier: "hot",
    tags: ["enterprise", "urgent", "decision-maker"],
    lastActivity: "2 min ago",
    stage: "Proposal Sent",
  },
  {
    name: "Jordan Lee",
    company: "FinanceHub",
    email: "jordan@financehub.com",
    role: "Director of Revenue",
    score: 72,
    tier: "warm",
    tags: ["mid-market", "technical-buyer"],
    lastActivity: "15 min ago",
    stage: "Demo Scheduled",
  },
  {
    name: "Sam Taylor",
    company: "StartupXYZ",
    email: "sam@startupxyz.com",
    role: "Founder",
    score: 45,
    tier: "cool",
    tags: ["smb", "exploring"],
    lastActivity: "1 hr ago",
    stage: "Qualifying",
  },
  {
    name: "Chris Morgan",
    company: "BigCorp Ltd",
    email: "chris@bigcorp.com",
    role: "VP Operations",
    score: 92,
    tier: "hot",
    tags: ["enterprise", "immediate", "decision-maker"],
    lastActivity: "30 min ago",
    stage: "Negotiation",
  },
  {
    name: "Pat Kim",
    company: "DataFlow Inc",
    email: "pat@dataflow.io",
    role: "Sales Manager",
    score: 30,
    tier: "cold",
    tags: ["smb", "no-budget"],
    lastActivity: "3 hrs ago",
    stage: "Nurturing",
  },
];

const tierColors: Record<string, string> = {
  hot: "bg-red-500/15 text-red-400",
  warm: "bg-orange-500/15 text-orange-400",
  cool: "bg-blue-500/15 text-blue-400",
  cold: "bg-muted text-muted-foreground",
};

const pipeline = [
  { stage: "New", count: 12 },
  { stage: "Qualifying", count: 8 },
  { stage: "Demo Scheduled", count: 5 },
  { stage: "Proposal Sent", count: 3 },
  { stage: "Negotiation", count: 2 },
  { stage: "Closed Won", count: 12 },
];

export default function LeadsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Lead Pipeline</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage your qualified leads
        </p>
      </div>

      {/* Pipeline stages */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {pipeline.map((stage, i) => (
          <div key={stage.stage} className="flex items-center">
            <div className={`bg-card border border-border/50 rounded-lg px-4 py-3 min-w-[120px] text-center ${stage.stage === "Closed Won" ? "border-green-500/30 bg-green-500/5" : ""}`}>
              <p className="text-2xl font-bold">{stage.count}</p>
              <p className="text-xs text-muted-foreground">{stage.stage}</p>
            </div>
            {i < pipeline.length - 1 && (
              <ArrowRight className="h-4 w-4 text-muted-foreground mx-1 shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Leads table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Leads ({leads.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leads.map((lead, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-lg border border-border/50 hover:bg-accent transition-colors cursor-pointer"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                  {lead.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{lead.name}</p>
                    <span className="text-sm text-muted-foreground">
                      {lead.role} at {lead.company}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {lead.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`text-xs px-2 py-1 rounded-full font-medium ${tierColors[lead.tier]}`}
                    >
                      {lead.tier.toUpperCase()}
                    </div>
                    <span className="text-lg font-bold">{lead.score}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lead.stage}
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {lead.lastActivity}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
