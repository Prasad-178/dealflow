import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  SLACK_MCP_CONFIG,
  getSlackMCPTransportConfig,
  isSlackMCPConfigured,
} from "@/lib/integrations/slack-mcp";

describe("Slack MCP Integration", () => {
  describe("SLACK_MCP_CONFIG", () => {
    it("has the correct MCP endpoint", () => {
      expect(SLACK_MCP_CONFIG.endpoint).toBe("https://mcp.slack.com/mcp");
    });

    it("uses streamable-http transport", () => {
      expect(SLACK_MCP_CONFIG.transport).toBe("streamable-http");
    });

    it("has OAuth endpoints", () => {
      expect(SLACK_MCP_CONFIG.oauth.authorizationUrl).toContain("slack.com/oauth");
      expect(SLACK_MCP_CONFIG.oauth.tokenUrl).toContain("oauth.v2.user.access");
    });

    it("declares scopes for all capabilities", () => {
      expect(SLACK_MCP_CONFIG.scopes.search).toContain("search:read.public");
      expect(SLACK_MCP_CONFIG.scopes.messaging).toContain("chat:write");
      expect(SLACK_MCP_CONFIG.scopes.channels).toContain("channels:history");
      expect(SLACK_MCP_CONFIG.scopes.users).toContain("users:read");
    });
  });

  describe("getSlackMCPTransportConfig", () => {
    it("returns transport config with valid token", () => {
      const config = getSlackMCPTransportConfig("xoxp-user-token");

      expect(config).not.toBeNull();
      expect(config!.type).toBe("streamable-http");
      expect(config!.url).toBe("https://mcp.slack.com/mcp");
      expect(config!.headers.Authorization).toBe("Bearer xoxp-user-token");
    });

    it("returns null for empty token", () => {
      const config = getSlackMCPTransportConfig("");
      expect(config).toBeNull();
    });
  });

  describe("isSlackMCPConfigured", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("returns false without env vars", () => {
      delete process.env.SLACK_CLIENT_ID;
      delete process.env.SLACK_CLIENT_SECRET;
      expect(isSlackMCPConfigured()).toBe(false);
    });

    it("returns true with both env vars", () => {
      process.env.SLACK_CLIENT_ID = "test-id";
      process.env.SLACK_CLIENT_SECRET = "test-secret";
      expect(isSlackMCPConfigured()).toBe(true);
    });

    it("returns false with only client ID", () => {
      process.env.SLACK_CLIENT_ID = "test-id";
      delete process.env.SLACK_CLIENT_SECRET;
      expect(isSlackMCPConfigured()).toBe(false);
    });
  });
});
