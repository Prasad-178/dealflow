import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messageQueue } from "@/lib/db/schema";
import { inngest } from "@/lib/inngest/client";
import { verifySlackSignature } from "@/lib/integrations/slack";
import { verifyTelegramToken } from "@/lib/integrations/telegram";

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
    const queueItem = await enqueueAndFire(platform as ValidPlatform, payload);
    return NextResponse.json({ success: true, messageId: queueItem.id });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
