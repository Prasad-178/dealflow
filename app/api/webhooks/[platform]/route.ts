import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messageQueue } from "@/lib/db/schema";
import { inngest } from "@/lib/inngest/client";
import { verifySlackSignature } from "@/lib/integrations/slack";
import { verifyTelegramToken } from "@/lib/integrations/telegram";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger.create("api:webhooks");

const validPlatforms = ["slack", "email", "telegram", "widget", "api"] as const;
type ValidPlatform = (typeof validPlatforms)[number];

async function enqueueAndFire(platform: ValidPlatform, payload: Record<string, unknown>) {
  const [queueItem] = await db
    .insert(messageQueue)
    .values({ platform, payload, status: "pending" })
    .returning();

  await inngest.send({
    name: "webhook/message.received",
    data: { messageQueueId: queueItem.id, platform },
  });

  return queueItem;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;

  if (!validPlatforms.includes(platform as ValidPlatform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  try {
    // Rate limit: 60 req/min per IP
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rl = rateLimit(`webhook:${ip}`, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    // --- Platform-specific signature verification ---
    if (platform === "slack") {
      const { valid, rawBody } = await verifySlackSignature(request);

      // If signing secret is configured, enforce verification
      if (process.env.SLACK_SIGNING_SECRET && !valid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }

      const payload = JSON.parse(rawBody || "{}");

      // Handle Slack url_verification challenge
      if (payload.type === "url_verification") {
        return NextResponse.json({ challenge: payload.challenge });
      }

      const queueItem = await enqueueAndFire("slack", payload);
      return NextResponse.json({ success: true, messageId: queueItem.id });
    }

    if (platform === "telegram") {
      if (process.env.TELEGRAM_WEBHOOK_SECRET && !verifyTelegramToken(request)) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }

      const payload = await request.json();
      const queueItem = await enqueueAndFire("telegram", payload);
      return NextResponse.json({ success: true, messageId: queueItem.id });
    }

    // Email, widget, api — no special verification
    const payload = await request.json();

    // Basic payload validation for widget and api platforms
    if (platform === "widget" || platform === "api") {
      if (!payload.text || typeof payload.text !== "string") {
        return NextResponse.json(
          { error: "Payload must include a 'text' field of type string" },
          { status: 400 }
        );
      }
    }

    // Basic email payload validation
    if (platform === "email") {
      const text = payload.text || payload.body || payload.html;
      if (!payload.from || !text) {
        return NextResponse.json(
          { error: "Email payload must include 'from' and 'text' (or 'body'/'html') fields" },
          { status: 400 }
        );
      }
    }

    const queueItem = await enqueueAndFire(platform as ValidPlatform, payload);
    return NextResponse.json({ success: true, messageId: queueItem.id });
  } catch (error) {
    log.error("Webhook processing failed", { error: String(error), platform });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
