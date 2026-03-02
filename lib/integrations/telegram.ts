import type { NormalizedMessage, OutboundMessage } from "./types";

/**
 * Verify Telegram webhook by checking the secret token header.
 */
export function verifyTelegramToken(request: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return false;

  const headerToken = request.headers.get("x-telegram-bot-api-secret-token");
  return headerToken === secret;
}

export function parseTelegramPayload(
  payload: Record<string, unknown>
): NormalizedMessage | null {
  const message = payload.message as Record<string, unknown> | undefined;
  if (!message) return null;

  const text = message.text as string | undefined;
  if (!text) return null;

  const chat = message.chat as Record<string, unknown>;
  const chatId = chat.id as number;
  const from = message.from as Record<string, unknown> | undefined;

  const senderName = from
    ? [from.first_name, from.last_name].filter(Boolean).join(" ")
    : undefined;
  const senderHandle = from?.username as string | undefined;

  return {
    platform: "telegram",
    text,
    senderName: senderName || undefined,
    senderHandle: senderHandle ? `@${senderHandle}` : undefined,
    replyTo: {
      type: "telegram",
      chatId,
    },
  };
}

export async function sendTelegramMessage(
  msg: OutboundMessage
): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN not configured, skipping send");
    return false;
  }

  if (msg.replyTo.type !== "telegram") return false;

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: msg.replyTo.chatId,
        text: msg.text,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[telegram] Send failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[telegram] Send failed:", error);
    return false;
  }
}
