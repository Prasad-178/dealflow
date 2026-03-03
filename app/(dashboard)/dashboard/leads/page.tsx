"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, ChevronLeft, ChevronRight } from "lucide-react";

type Lead = {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  role: string | null;
  qualificationScore: number | null;
  tags: string[];
  createdAt: string;
};

const tierColors: Record<string, string> = {
  hot: "bg-red-500/15 text-red-400",
  warm: "bg-orange-500/15 text-orange-400",
  cool: "bg-blue-500/15 text-blue-400",
  cold: "bg-muted text-muted-foreground",
};

function getTier(score: number): string {
  if (score >= 80) return "hot";
  if (score >= 50) return "warm";
  if (score >= 30) return "cool";
  return "cold";
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      sort,
      order,
      ...(search ? { search } : {}),
    });
    fetch(`/api/dashboard/leads?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setLeads(data.leads || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, sort, order, search]);

  function toggleSort(field: string) {
    if (sort === field) {
      setOrder(order === "desc" ? "asc" : "desc");
    } else {
      setSort(field);
      setOrder("desc");
    }
    setPage(1);
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Lead Pipeline</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage your qualified leads
        </p>
      </div>

      {/* Search and Sort */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={sort === "score" ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSort("score")}
          >
            Score {sort === "score" && (order === "desc" ? "↓" : "↑")}
          </Button>
          <Button
            variant={sort === "name" ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSort("name")}
          >
            Name {sort === "name" && (order === "desc" ? "↓" : "↑")}
          </Button>
          <Button
            variant={sort === "createdAt" ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSort("createdAt")}
          >
            Date {sort === "createdAt" && (order === "desc" ? "↓" : "↑")}
          </Button>
        </div>
      </div>

      {/* Leads table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Leads ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : leads.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No leads found. Leads are created when prospects interact with your agents.
            </p>
          ) : (
            <div className="space-y-3">
              {leads.map((lead) => {
                const score = lead.qualificationScore ?? 0;
                const tier = getTier(score);
                return (
                  <div
                    key={lead.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border/50 hover:bg-accent transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      {(lead.name || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {lead.name || "Unknown"}
                        </p>
                        {lead.role && lead.company && (
                          <span className="text-sm text-muted-foreground">
                            {lead.role} at {lead.company}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {(lead.tags || []).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-2">
                        <div
                          className={`text-xs px-2 py-1 rounded-full font-medium ${tierColors[tier]}`}
                        >
                          {tier.toUpperCase()}
                        </div>
                        <span className="text-lg font-bold">{score}</span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
