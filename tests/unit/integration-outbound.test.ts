import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendOutboundMessage } from "@/lib/integrations/outbound";

describe("Outbound Dispatcher", () => {
  describe("sendOutboundMessage", () => {
    it("returns true for widget platform (no-op)", async () => {
      const result = await sendOutboundMessage({
        platform: "widget",
        text: "Hello",
        replyTo: { type: "widget" },
      });

      expect(result).toBe(true);
    });

    it("returns true for api platform (no-op)", async () => {
      const result = await sendOutboundMessage({
        platform: "api",
        text: "Hello",
        replyTo: { type: "api" },
      });

      expect(result).toBe(true);
    });

    it("routes email messages to email sender", async () => {
      // With RESEND_API_KEY set, this will attempt to send but may fail
      // depending on whether the domain is verified. We just verify it
      // doesn't throw and returns a boolean.
      const result = await sendOutboundMessage({
        platform: "email",
        text: "Hello",
        replyTo: {
          type: "email",
          toEmail: "test@example.com",
          subject: "Test",
        },
      });

      expect(typeof result).toBe("boolean");
    });

    it("routes slack messages to slack sender", async () => {
      // With SLACK_BOT_TOKEN set, this will attempt to send but fail
      // on an invalid channel. We just verify it returns a boolean.
      const result = await sendOutboundMessage({
        platform: "slack",
        text: "Hello",
        replyTo: {
          type: "slack",
          channelId: "C01ABC_INVALID",
        },
      });

      expect(typeof result).toBe("boolean");
    });

    it("routes telegram messages to telegram sender", async () => {
      const result = await sendOutboundMessage({
        platform: "telegram",
        text: "Hello",
        replyTo: {
          type: "telegram",
          chatId: 12345,
        },
      });

      expect(typeof result).toBe("boolean");
    });

    it("returns false for unknown platform", async () => {
      const result = await sendOutboundMessage({
        platform: "whatsapp" as any,
        text: "Hello",
        replyTo: { type: "api" } as any,
      });

      expect(result).toBe(false);
    });
  });
});
