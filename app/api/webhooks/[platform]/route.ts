import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messageQueue } from "@/lib/db/schema";
import { inngest } from "@/lib/inngest/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;

  // Validate platform
  const validPlatforms = ["slack", "email", "widget", "api"];
  if (!validPlatforms.includes(platform)) {
    return NextResponse.json(
      { error: "Invalid platform" },
      { status: 400 }
    );
  }

  try {
    const payload = await request.json();

    // Return 200 immediately (3-second timeout pattern)
    // Queue for background processing
    const [queueItem] = await db
      .insert(messageQueue)
      .values({
        platform: platform as "slack" | "email" | "widget" | "api",
        payload,
        status: "pending",
      })
      .returning();

    // Trigger Inngest function for background processing
    await inngest.send({
      name: "webhook/message.received",
      data: { messageQueueId: queueItem.id, platform },
    });

    return NextResponse.json({
      success: true,
      messageId: queueItem.id,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
