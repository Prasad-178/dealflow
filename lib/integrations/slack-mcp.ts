/**
 * Slack MCP Server integration.
 *
 * The Slack MCP server (https://mcp.slack.com/mcp) provides AI agents with
 * search, messaging, and channel history capabilities via the Model Context
 * Protocol over Streamable HTTP.
 *
 * This module provides a helper to connect to the Slack MCP server and expose
 * its tools for use within our agent pipeline. It complements the webhook-based
 * inbound/outbound flow in slack.ts — that handles real-time message events,
 * while this enables agents to proactively search Slack workspace context.
 *
 * Requires a Slack app with:
 *   - OAuth 2.0 configured (client_id, client_secret)
 *   - Appropriate scopes: search:read.public, channels:history, users:read, chat:write
 *   - App must be directory-published or an internal app
 *
 * Auth flow uses Slack's OAuth 2.0:
 *   - Authorization: https://slack.com/oauth/v2_user/authorize
 *   - Token exchange: https://slack.com/api/oauth.v2.user.access
 */

export const SLACK_MCP_CONFIG = {
  /** The remote MCP server endpoint */
  endpoint: "https://mcp.slack.com/mcp",

  /** Transport type for the MCP client */
  transport: "streamable-http" as const,

  /** OAuth 2.0 endpoints */
  oauth: {
    authorizationUrl: "https://slack.com/oauth/v2_user/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.user.access",
  },

  /** Recommended scopes by capability */
  scopes: {
    search: ["search:read.public", "search:read.private", "search:read.files"],
    messaging: ["chat:write"],
    channels: ["channels:history", "groups:history", "im:history"],
    users: ["users:read", "users:read.email"],
    canvases: ["canvases:read", "canvases:write"],
  },
};

/**
 * Get the Slack MCP client configuration for use with @ai-sdk/mcp.
 *
 * Usage with Vercel AI SDK:
 * ```ts
 * import { experimental_createMCPClient } from "@ai-sdk/mcp";
 *
 * const mcpClient = await experimental_createMCPClient({
 *   transport: {
 *     type: "streamable-http",
 *     url: SLACK_MCP_CONFIG.endpoint,
 *     headers: {
 *       Authorization: `Bearer ${userAccessToken}`,
 *     },
 *   },
 * });
 *
 * const slackTools = await mcpClient.tools();
 * // Pass slackTools to generateText() alongside other agent tools
 * ```
 */
export function getSlackMCPTransportConfig(userAccessToken: string) {
  if (!userAccessToken) {
    return null;
  }

  return {
    type: "streamable-http" as const,
    url: SLACK_MCP_CONFIG.endpoint,
    headers: {
      Authorization: `Bearer ${userAccessToken}`,
    },
  };
}

/**
 * Check if Slack MCP is configured.
 * Requires SLACK_CLIENT_ID and SLACK_CLIENT_SECRET for the OAuth flow.
 */
export function isSlackMCPConfigured(): boolean {
  return !!(
    process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET
  );
}
