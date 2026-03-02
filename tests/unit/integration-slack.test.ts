import { describe, it, expect } from "vitest";
import { parseSlackPayload } from "@/lib/integrations/slack";

describe("Slack Integration", () => {
  describe("parseSlackPayload", () => {
    it("parses a standard message event", () => {
      const result = parseSlackPayload({
        type: "event_callback",
        event: {
          type: "message",
          text: "Hello, I need help with pricing",
          channel: "C01ABC123",
          user: "U01USER123",
          ts: "1234567890.123456",
        },
      });

      expect(result).not.toBeNull();
      expect(result!.platform).toBe("slack");
      expect(result!.text).toBe("Hello, I need help with pricing");
      expect(result!.senderHandle).toBe("U01USER123");
      if (result!.replyTo.type === "slack") {
        expect(result!.replyTo.channelId).toBe("C01ABC123");
        expect(result!.replyTo.threadTs).toBe("1234567890.123456");
      }
    });

    it("returns null for url_verification challenge", () => {
      const result = parseSlackPayload({
        type: "url_verification",
        challenge: "test_challenge_token",
      });

      expect(result).toBeNull();
    });

    it("returns null for bot messages (prevents loops)", () => {
      const result = parseSlackPayload({
        type: "event_callback",
        event: {
          type: "message",
          text: "I am a bot",
          channel: "C01ABC123",
          bot_id: "B01BOT123",
          ts: "1234567890.123456",
        },
      });

      expect(result).toBeNull();
    });

    it("returns null for bot_message subtype", () => {
      const result = parseSlackPayload({
        type: "event_callback",
        event: {
          type: "message",
          subtype: "bot_message",
          text: "Bot response",
          channel: "C01ABC123",
          ts: "1234567890.123456",
        },
      });

      expect(result).toBeNull();
    });

    it("returns null when event is missing", () => {
      const result = parseSlackPayload({
        type: "event_callback",
      });

      expect(result).toBeNull();
    });

    it("returns null when event type is not message", () => {
      const result = parseSlackPayload({
        type: "event_callback",
        event: {
          type: "reaction_added",
          reaction: "thumbsup",
          item: { channel: "C01ABC123" },
        },
      });

      expect(result).toBeNull();
    });

    it("returns null when text is empty", () => {
      const result = parseSlackPayload({
        type: "event_callback",
        event: {
          type: "message",
          channel: "C01ABC123",
          user: "U01USER123",
          ts: "1234567890.123456",
        },
      });

      expect(result).toBeNull();
    });

    it("uses thread_ts when available", () => {
      const result = parseSlackPayload({
        type: "event_callback",
        event: {
          type: "message",
          text: "Threaded reply",
          channel: "C01ABC123",
          user: "U01USER123",
          ts: "1234567890.654321",
          thread_ts: "1234567890.123456",
        },
      });

      if (result!.replyTo.type === "slack") {
        expect(result!.replyTo.threadTs).toBe("1234567890.123456");
      }
    });
  });
});
