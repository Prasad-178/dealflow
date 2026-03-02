import { describe, it, expect, vi } from "vitest";
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

    it("returns false for email without RESEND_API_KEY", async () => {
      const result = await sendOutboundMessage({
        platform: "email",
        text: "Hello",
        replyTo: {
          type: "email",
          toEmail: "test@example.com",
          subject: "Test",
        },
      });

      expect(result).toBe(false);
    });

    it("returns false for slack without SLACK_BOT_TOKEN", async () => {
      const result = await sendOutboundMessage({
        platform: "slack",
        text: "Hello",
        replyTo: {
          type: "slack",
          channelId: "C01ABC",
        },
      });

      expect(result).toBe(false);
    });

    it("returns false for telegram without TELEGRAM_BOT_TOKEN", async () => {
      const result = await sendOutboundMessage({
        platform: "telegram",
        text: "Hello",
        replyTo: {
          type: "telegram",
          chatId: 12345,
        },
      });

      expect(result).toBe(false);
    });
  });
});
