import { describe, it, expect } from "vitest";
import { parseEmailPayload } from "@/lib/integrations/email";
import { parseSlackPayload } from "@/lib/integrations/slack";
import { parseTelegramPayload } from "@/lib/integrations/telegram";

/**
 * Cross-platform parsing tests to verify NormalizedMessage contract
 * consistency across all platform parsers.
 */
describe("Cross-Platform Webhook Parsing", () => {
  describe("NormalizedMessage contract", () => {
    it("all parsers produce the same shape with platform field", () => {
      const email = parseEmailPayload({
        from: "John <john@test.com>",
        text: "Hello from email",
        subject: "Test",
      });

      const slack = parseSlackPayload({
        type: "event_callback",
        event: {
          type: "message",
          text: "Hello from slack",
          channel: "C123",
          user: "U123",
          ts: "123.456",
        },
      });

      const telegram = parseTelegramPayload({
        update_id: 1,
        message: {
          message_id: 1,
          from: { id: 1, is_bot: false, first_name: "John" },
          chat: { id: 123, type: "private" },
          date: 123456,
          text: "Hello from telegram",
        },
      });

      // All should have the required fields
      for (const msg of [email, slack, telegram]) {
        expect(msg).not.toBeNull();
        expect(msg).toHaveProperty("platform");
        expect(msg).toHaveProperty("text");
        expect(msg).toHaveProperty("replyTo");
        expect(msg!.replyTo).toHaveProperty("type");
      }

      // Platform fields match
      expect(email!.platform).toBe("email");
      expect(slack!.platform).toBe("slack");
      expect(telegram!.platform).toBe("telegram");

      // ReplyTo types match platform
      expect(email!.replyTo.type).toBe("email");
      expect(slack!.replyTo.type).toBe("slack");
      expect(telegram!.replyTo.type).toBe("telegram");
    });

    it("all parsers return null for empty/invalid payloads", () => {
      expect(parseEmailPayload({})).toBeNull();
      expect(parseSlackPayload({})).toBeNull();
      expect(parseTelegramPayload({})).toBeNull();
    });

    it("all parsers return null for payloads missing text content", () => {
      expect(parseEmailPayload({ from: "test@test.com" })).toBeNull();

      expect(
        parseSlackPayload({
          type: "event_callback",
          event: { type: "message", channel: "C123", user: "U123", ts: "1" },
        })
      ).toBeNull();

      expect(
        parseTelegramPayload({
          update_id: 1,
          message: {
            message_id: 1,
            from: { id: 1, is_bot: false, first_name: "J" },
            chat: { id: 1, type: "private" },
            date: 1,
            photo: [{ file_id: "x", width: 1, height: 1 }],
          },
        })
      ).toBeNull();
    });
  });

  describe("Sender identification", () => {
    it("email parser extracts senderEmail and senderName", () => {
      const msg = parseEmailPayload({
        from: "Jane Doe <jane@company.com>",
        text: "Hello",
      });
      expect(msg!.senderEmail).toBe("jane@company.com");
      expect(msg!.senderName).toBe("Jane Doe");
    });

    it("slack parser extracts senderHandle (user ID)", () => {
      const msg = parseSlackPayload({
        type: "event_callback",
        event: {
          type: "message",
          text: "Hi",
          channel: "C1",
          user: "U01ABCDEF",
          ts: "1",
        },
      });
      expect(msg!.senderHandle).toBe("U01ABCDEF");
    });

    it("telegram parser extracts senderName and senderHandle", () => {
      const msg = parseTelegramPayload({
        update_id: 1,
        message: {
          message_id: 1,
          from: {
            id: 123,
            is_bot: false,
            first_name: "Alice",
            last_name: "Smith",
            username: "alicesmith",
          },
          chat: { id: 1, type: "private" },
          date: 1,
          text: "Hey",
        },
      });
      expect(msg!.senderName).toBe("Alice Smith");
      expect(msg!.senderHandle).toBe("@alicesmith");
    });
  });

  describe("ReplyTo routing information", () => {
    it("email replyTo has toEmail and subject for threading", () => {
      const msg = parseEmailPayload({
        from: "user@test.com",
        text: "Q",
        subject: "Pricing question",
        messageId: "<msg123@mail.test.com>",
      });
      expect(msg!.replyTo).toEqual({
        type: "email",
        toEmail: "user@test.com",
        subject: "Re: Pricing question",
        inReplyTo: "<msg123@mail.test.com>",
      });
    });

    it("slack replyTo has channelId and threadTs", () => {
      const msg = parseSlackPayload({
        type: "event_callback",
        event: {
          type: "message",
          text: "Q",
          channel: "C01CHANNEL",
          user: "U1",
          ts: "1234.5678",
          thread_ts: "1234.0000",
        },
      });
      expect(msg!.replyTo).toEqual({
        type: "slack",
        channelId: "C01CHANNEL",
        threadTs: "1234.0000",
      });
    });

    it("telegram replyTo has chatId", () => {
      const msg = parseTelegramPayload({
        update_id: 1,
        message: {
          message_id: 1,
          from: { id: 1, is_bot: false, first_name: "J" },
          chat: { id: 999888777, type: "private" },
          date: 1,
          text: "Q",
        },
      });
      expect(msg!.replyTo).toEqual({
        type: "telegram",
        chatId: 999888777,
      });
    });
  });
});
