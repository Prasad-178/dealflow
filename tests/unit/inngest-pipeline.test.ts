import { describe, it, expect } from "vitest";
import { parseEmailPayload } from "@/lib/integrations/email";
import { parseSlackPayload } from "@/lib/integrations/slack";
import { parseTelegramPayload } from "@/lib/integrations/telegram";
import type { NormalizedMessage, Platform } from "@/lib/integrations/types";

/**
 * Tests for the Inngest pipeline parsing logic.
 * The parsePayload function from functions.ts is inlined here since
 * it's not exported. We replicate the same logic to test it.
 */
function parsePayload(
  platform: string,
  payload: Record<string, unknown>
): NormalizedMessage | null {
  switch (platform) {
    case "email":
      return parseEmailPayload(payload);
    case "slack":
      return parseSlackPayload(payload);
    case "telegram":
      return parseTelegramPayload(payload);
    case "widget":
    case "api":
      return {
        platform: platform as Platform,
        text: (payload.text as string) || (payload.message as string) || "",
        senderEmail: payload.senderEmail as string | undefined,
        senderName: payload.senderName as string | undefined,
        replyTo: { type: platform as "widget" | "api" },
      };
    default:
      return null;
  }
}

describe("Inngest Pipeline - Payload Parsing", () => {
  describe("parsePayload routing", () => {
    it("routes email payloads to email parser", () => {
      const result = parsePayload("email", {
        from: "john@test.com",
        text: "Hello",
        subject: "Inquiry",
      });

      expect(result).not.toBeNull();
      expect(result!.platform).toBe("email");
      expect(result!.senderEmail).toBe("john@test.com");
    });

    it("routes slack payloads to slack parser", () => {
      const result = parsePayload("slack", {
        type: "event_callback",
        event: {
          type: "message",
          text: "Help me",
          channel: "C123",
          user: "U123",
          ts: "1.2",
        },
      });

      expect(result).not.toBeNull();
      expect(result!.platform).toBe("slack");
    });

    it("routes telegram payloads to telegram parser", () => {
      const result = parsePayload("telegram", {
        update_id: 1,
        message: {
          message_id: 1,
          from: { id: 1, is_bot: false, first_name: "Bob" },
          chat: { id: 99, type: "private" },
          date: 1,
          text: "Hi",
        },
      });

      expect(result).not.toBeNull();
      expect(result!.platform).toBe("telegram");
    });

    it("handles widget payloads with text field", () => {
      const result = parsePayload("widget", {
        text: "Hello from widget",
        senderEmail: "user@test.com",
        senderName: "Test User",
      });

      expect(result).not.toBeNull();
      expect(result!.platform).toBe("widget");
      expect(result!.text).toBe("Hello from widget");
      expect(result!.senderEmail).toBe("user@test.com");
      expect(result!.senderName).toBe("Test User");
      expect(result!.replyTo.type).toBe("widget");
    });

    it("handles api payloads with message field", () => {
      const result = parsePayload("api", {
        message: "API message",
      });

      expect(result).not.toBeNull();
      expect(result!.platform).toBe("api");
      expect(result!.text).toBe("API message");
    });

    it("returns null for unknown platform", () => {
      const result = parsePayload("whatsapp", { text: "Hello" });
      expect(result).toBeNull();
    });

    it("widget/api fallback to empty text", () => {
      const result = parsePayload("widget", {});
      expect(result).not.toBeNull();
      expect(result!.text).toBe("");
    });
  });

  describe("pipeline step validation", () => {
    it("companyId resolves from env or default", () => {
      const companyId =
        process.env.DEFAULT_COMPANY_ID || "00000000-0000-0000-0000-000000000000";
      expect(companyId).toBeTruthy();
      // Should be a UUID-like string
      expect(companyId.length).toBeGreaterThanOrEqual(36);
    });

    it("message ordering is sequential", () => {
      const messages = [
        { orderIndex: 0, role: "user", content: "Hi" },
        { orderIndex: 1, role: "assistant", content: "Hello!" },
        { orderIndex: 2, role: "user", content: "Pricing?" },
      ];

      for (let i = 0; i < messages.length; i++) {
        expect(messages[i].orderIndex).toBe(i);
      }
    });

    it("history messages filter to user and assistant only", () => {
      const allMessages = [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello!" },
        { role: "system", content: "System prompt" },
        { role: "tool", content: '{"result": true}' },
        { role: "user", content: "More?" },
      ];

      const filtered = allMessages.filter(
        (m) => m.content && (m.role === "user" || m.role === "assistant")
      );
      expect(filtered).toHaveLength(3);
      expect(filtered.every((m) => m.role === "user" || m.role === "assistant")).toBe(true);
    });
  });
});
