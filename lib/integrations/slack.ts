import crypto from "crypto";
import { WebClient } from "@slack/web-api";
import type { NormalizedMessage, OutboundMessage } from "./types";

function getSlackClient(): WebClient | null {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;
  return new WebClient(token);
}

/**
 * Verify Slack request signature (HMAC-SHA256 + 5-min replay guard).
 * Returns the raw body needed for signature verification.
 */
export async function verifySlackSignature(
  request: Request
): Promise<{ valid: boolean; rawBody: string }> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    return { valid: false, rawBody: "" };
  }

  const rawBody = await request.text();
  const timestamp = request.headers.get("x-slack-request-timestamp");
  const slackSignature = request.headers.get("x-slack-signature");

  if (!timestamp || !slackSignature) {
    return { valid: false, rawBody };
  }

  // Replay attack guard: reject requests older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    return { valid: false, rawBody };
  }

  const sigBasestring = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto
    .createHmac("sha256", signingSecret)
    .update(sigBasestring)
    .digest("hex");
  const expectedSignature = `v0=${hmac}`;

  const valid = crypto.timingSafeEqual(
    Buffer.from(slackSignature),
    Buffer.from(expectedSignature)
  );

  return { valid, rawBody };
}

export function parseSlackPayload(
  payload: Record<string, unknown>
): NormalizedMessage | null {
  // Handle Events API url_verification challenge
  if (payload.type === "url_verification") {
    return null; // Caller should handle challenge response
  }

  const event = payload.event as Record<string, unknown> | undefined;
  if (!event || event.type !== "message") return null;

  // Skip bot messages to prevent loops
  if (event.bot_id || event.subtype === "bot_message") return null;

  const text = event.text as string | undefined;
  if (!text) return null;

  const channelId = event.channel as string;
  const threadTs = (event.thread_ts as string) || (event.ts as string);
  const userId = event.user as string | undefined;

  return {
    platform: "slack",
    text,
    senderHandle: userId,
    replyTo: {
      type: "slack",
      channelId,
      threadTs,
    },
  };
}

export async function sendSlackMessage(msg: OutboundMessage): Promise<boolean> {
  const client = getSlackClient();
  if (!client) {
    console.warn("[slack] SLACK_BOT_TOKEN not configured, skipping send");
    return false;
  }

  if (msg.replyTo.type !== "slack") return false;

  try {
    await client.chat.postMessage({
      channel: msg.replyTo.channelId,
      text: msg.text,
      ...(msg.replyTo.threadTs ? { thread_ts: msg.replyTo.threadTs } : {}),
    });
    return true;
  } catch (error) {
    console.error("[slack] Send failed:", error);
    return false;
  }
}
