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
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Upload,
  Search,
  FileText,
  HelpCircle,
  BarChart,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";

type KBEntry = {
  id: string;
  content: string;
  sourceType: string;
  sourceId: string | null;
  createdAt: string;
};

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
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadContent, setUploadContent] = useState("");
  const [uploadType, setUploadType] = useState("product_doc");
  const [uploading, setUploading] = useState(false);

  function fetchData() {
    setLoading(true);
    fetch(`/api/dashboard/knowledge?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries || []);
        setTypeCounts(data.typeCounts || {});
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchData();
  }, [page]);

  async function handleUpload() {
    if (!uploadContent.trim()) return;
    setUploading(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: uploadContent,
          sourceType: uploadType,
        }),
      });
      if (res.ok) {
        setUploadContent("");
        setShowUpload(false);
        fetchData();
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    if (res.ok) fetchData();
  }

  const filtered = search
    ? entries.filter((e) =>
        e.content.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">
            Manage product docs, FAQs, and case studies used by the AI agents
          </p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Add Knowledge Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Source Type
              </label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.entries(sourceLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Content</label>
              <textarea
                value={uploadContent}
                onChange={(e) => setUploadContent(e.target.value)}
                placeholder="Enter the knowledge content..."
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading..." : "Add Entry"}
              </Button>
              <Button variant="outline" onClick={() => setShowUpload(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Object.entries(sourceLabels).map(([type, label]) => {
          const count = typeCounts[type] || 0;
          const Icon = sourceIcons[type];
          return (
            <Card key={type}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : count}
                  </p>
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
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No knowledge entries found. Upload documents to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => {
            const Icon = sourceIcons[entry.sourceType] || FileText;
            return (
              <Card
                key={entry.id}
                className={`border-l-4 ${sourceAccents[entry.sourceType] || ""} hover:border-primary/50 transition-colors`}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {entry.sourceId || entry.sourceType}
                    </p>
                    <p className="text-sm text-muted-foreground truncate max-w-lg">
                      {entry.content}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {sourceLabels[entry.sourceType] || entry.sourceType}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
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
    </div>
  );
}
