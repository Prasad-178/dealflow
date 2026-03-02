import { describe, it, expect } from "vitest";
import { parseTelegramPayload } from "@/lib/integrations/telegram";

describe("Telegram Integration", () => {
  describe("parseTelegramPayload", () => {
    it("parses a standard text message", () => {
      const result = parseTelegramPayload({
        update_id: 123456789,
        message: {
          message_id: 1,
          from: {
            id: 12345,
            is_bot: false,
            first_name: "John",
            last_name: "Doe",
            username: "johndoe",
          },
          chat: { id: 67890, type: "private" },
          date: 1234567890,
          text: "Tell me about your product",
        },
      });

      expect(result).not.toBeNull();
      expect(result!.platform).toBe("telegram");
      expect(result!.text).toBe("Tell me about your product");
      expect(result!.senderName).toBe("John Doe");
      expect(result!.senderHandle).toBe("@johndoe");
      if (result!.replyTo.type === "telegram") {
        expect(result!.replyTo.chatId).toBe(67890);
      }
    });

    it("handles first name only (no last name)", () => {
      const result = parseTelegramPayload({
        update_id: 123456789,
        message: {
          message_id: 1,
          from: { id: 12345, is_bot: false, first_name: "John" },
          chat: { id: 67890, type: "private" },
          date: 1234567890,
          text: "Hello",
        },
      });

      expect(result!.senderName).toBe("John");
      expect(result!.senderHandle).toBeUndefined();
    });

    it("returns null for photo-only messages (no text)", () => {
      const result = parseTelegramPayload({
        update_id: 123456789,
        message: {
          message_id: 1,
          from: { id: 12345, is_bot: false, first_name: "John" },
          chat: { id: 67890, type: "private" },
          date: 1234567890,
          photo: [{ file_id: "abc", width: 100, height: 100 }],
        },
      });

      expect(result).toBeNull();
    });

    it("returns null when message field is missing", () => {
      const result = parseTelegramPayload({
        update_id: 123456789,
        edited_message: {
          message_id: 1,
          chat: { id: 67890, type: "private" },
          text: "Edited",
        },
      });

      expect(result).toBeNull();
    });

    it("handles group chat messages", () => {
      const result = parseTelegramPayload({
        update_id: 123456789,
        message: {
          message_id: 1,
          from: { id: 12345, is_bot: false, first_name: "Alice" },
          chat: { id: -100123456, type: "group", title: "Test Group" },
          date: 1234567890,
          text: "Group message",
        },
      });

      expect(result).not.toBeNull();
      expect(result!.text).toBe("Group message");
      if (result!.replyTo.type === "telegram") {
        expect(result!.replyTo.chatId).toBe(-100123456);
      }
    });

    it("returns null when text is empty string", () => {
      const result = parseTelegramPayload({
        update_id: 123456789,
        message: {
          message_id: 1,
          from: { id: 12345, is_bot: false, first_name: "John" },
          chat: { id: 67890, type: "private" },
          date: 1234567890,
          text: "",
        },
      });

      // Empty string is falsy, should return null
      expect(result).toBeNull();
    });
  });
});
