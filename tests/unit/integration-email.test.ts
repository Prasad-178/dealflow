import { describe, it, expect } from "vitest";
import { parseEmailPayload } from "@/lib/integrations/email";

describe("Email Integration", () => {
  describe("parseEmailPayload", () => {
    it("parses standard email payload", () => {
      const result = parseEmailPayload({
        from: "john@example.com",
        subject: "Product inquiry",
        text: "I'm interested in your enterprise plan",
      });

      expect(result).not.toBeNull();
      expect(result!.platform).toBe("email");
      expect(result!.text).toBe("I'm interested in your enterprise plan");
      expect(result!.senderEmail).toBe("john@example.com");
      expect(result!.replyTo.type).toBe("email");
    });

    it("parses 'Name <email>' format", () => {
      const result = parseEmailPayload({
        from: "John Doe <john@example.com>",
        subject: "Hello",
        text: "Testing",
      });

      expect(result!.senderEmail).toBe("john@example.com");
      expect(result!.senderName).toBe("John Doe");
    });

    it("handles missing subject with default", () => {
      const result = parseEmailPayload({
        from: "john@example.com",
        text: "Just a message",
      });

      expect(result).not.toBeNull();
      if (result!.replyTo.type === "email") {
        expect(result!.replyTo.subject).toBe("Re: Your inquiry");
      }
    });

    it("strips existing Re: prefix from subject", () => {
      const result = parseEmailPayload({
        from: "john@example.com",
        subject: "Re: Product inquiry",
        text: "Following up",
      });

      if (result!.replyTo.type === "email") {
        expect(result!.replyTo.subject).toBe("Re: Product inquiry");
      }
    });

    it("returns null when from is missing", () => {
      const result = parseEmailPayload({
        subject: "Hello",
        text: "No sender",
      });

      expect(result).toBeNull();
    });

    it("returns null when text is missing", () => {
      const result = parseEmailPayload({
        from: "john@example.com",
        subject: "Hello",
      });

      expect(result).toBeNull();
    });

    it("uses body field as fallback for text", () => {
      const result = parseEmailPayload({
        from: "john@example.com",
        body: "Body content here",
      });

      expect(result).not.toBeNull();
      expect(result!.text).toBe("Body content here");
    });

    it("uses html field as fallback for text", () => {
      const result = parseEmailPayload({
        from: "john@example.com",
        html: "<p>HTML content</p>",
      });

      expect(result).not.toBeNull();
      expect(result!.text).toBe("<p>HTML content</p>");
    });

    it("preserves messageId for In-Reply-To threading", () => {
      const result = parseEmailPayload({
        from: "john@example.com",
        text: "Hello",
        messageId: "<abc123@mail.example.com>",
      });

      if (result!.replyTo.type === "email") {
        expect(result!.replyTo.inReplyTo).toBe("<abc123@mail.example.com>");
      }
    });

    it("trims whitespace from text", () => {
      const result = parseEmailPayload({
        from: "john@example.com",
        text: "  Hello world  \n",
      });

      expect(result!.text).toBe("Hello world");
    });
  });
});
