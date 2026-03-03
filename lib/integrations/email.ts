import { Resend } from "resend";
import type { NormalizedMessage, OutboundMessage } from "./types";
import { logger } from "@/lib/logger";

const log = logger.create("integrations:email");

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/**
 * Parse "Name <email>" or plain "email" format.
 */
function parseFromField(from: string): { name?: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { email: from.trim() };
}

export function parseEmailPayload(
  payload: Record<string, unknown>
): NormalizedMessage | null {
  const from = payload.from as string | undefined;
  const subject = payload.subject as string | undefined;
  const text =
    (payload.text as string) ||
    (payload.body as string) ||
    (payload.html as string);
  const messageId = payload.messageId as string | undefined;

  if (!from || !text) return null;

  const sender = parseFromField(from);

  return {
    platform: "email",
    text: text.trim(),
    senderEmail: sender.email,
    senderName: sender.name,
    replyTo: {
      type: "email",
      toEmail: sender.email,
      subject: subject ? `Re: ${subject.replace(/^Re:\s*/i, "")}` : "Re: Your inquiry",
      inReplyTo: messageId,
    },
  };
}

export async function sendEmail(msg: OutboundMessage): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    log.warn("RESEND_API_KEY not configured, skipping send");
    return false;
  }

  if (msg.replyTo.type !== "email") return false;

  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@example.com";

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: msg.replyTo.toEmail,
    subject: msg.replyTo.subject,
    text: msg.text,
    ...(msg.replyTo.inReplyTo
      ? {
          headers: {
            "In-Reply-To": msg.replyTo.inReplyTo,
            References: msg.replyTo.inReplyTo,
          },
        }
      : {}),
  });

  if (error) {
    log.error("Send failed", { error: String(error) });
    return false;
  }

  return true;
}

export async function sendMeetingConfirmation({
  toEmail,
  title,
  startTime,
  endTime,
  meetingLink,
}: {
  toEmail: string;
  title: string;
  startTime: Date;
  endTime: Date;
  meetingLink?: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    log.warn("RESEND_API_KEY not configured, skipping meeting confirmation");
    return false;
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@example.com";
  const start = startTime.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const end = endTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const meetLinkSection = meetingLink
    ? `\nJoin the meeting: ${meetingLink}\n`
    : "";

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: `Meeting Confirmed: ${title}`,
    text: `Your meeting has been confirmed!\n\n${title}\nWhen: ${start} - ${end}\n${meetLinkSection}\nLooking forward to speaking with you!`,
  });

  if (error) {
    log.error("Meeting confirmation failed", { error: String(error) });
    return false;
  }

  return true;
}
