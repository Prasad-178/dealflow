"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { use } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentType?: string;
  intent?: string;
};

export default function ChatPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [prospectId, setProspectId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          companyId,
          conversationId,
          prospectId,
        }),
      });

      const data = await response.json();

      if (data.conversationId) setConversationId(data.conversationId);
      if (data.prospectId) setProspectId(data.prospectId);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content || data.error || "Sorry, something went wrong.",
        agentType: data.agentType,
        intent: data.intent,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const agentColors: Record<string, string> = {
    knowledge: "bg-blue-500/15 text-blue-400",
    qualifier: "bg-green-500/15 text-green-400",
    deal: "bg-purple-500/15 text-purple-400",
    scheduler: "bg-orange-500/15 text-orange-400",
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">DealFlow AI</h1>
            <p className="text-sm text-muted-foreground">
              AI Sales Assistant
            </p>
          </div>
          {conversationId && (
            <Badge variant="outline" className="ml-auto text-xs">
              Active Session
            </Badge>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                Welcome to DealFlow AI
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                I&apos;m your AI sales assistant. Ask me about our products,
                pricing, or schedule a demo. How can I help you today?
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-6">
                {[
                  "What does your product do?",
                  "Show me your pricing",
                  "I'd like to schedule a demo",
                  "Do you integrate with Salesforce?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-2 rounded-full border border-border/50 bg-card text-sm hover:bg-accent transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3"
                    : "bg-card border border-border/50 rounded-2xl rounded-bl-md px-4 py-3"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.agentType && (
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        agentColors[message.agentType] || "bg-muted text-muted-foreground"
                      }`}
                    >
                      {message.agentType}
                    </span>
                    {message.intent && (
                      <span className="text-[10px] text-muted-foreground">
                        {message.intent}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {message.role === "user" && (
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border/50 bg-card/80 backdrop-blur-xl px-6 py-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-muted rounded-xl p-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 border-0 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" disabled={isLoading || !input.trim()} size="sm" className="rounded-lg">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
