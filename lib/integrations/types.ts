export type Platform = "email" | "slack" | "telegram" | "widget" | "api";

export interface NormalizedMessage {
  platform: Platform;
  text: string;
  senderEmail?: string;
  senderHandle?: string;
  senderName?: string;
  replyTo: ReplyTarget;
}

export type ReplyTarget =
  | { type: "email"; toEmail: string; subject: string; inReplyTo?: string }
  | { type: "slack"; channelId: string; threadTs?: string }
  | { type: "telegram"; chatId: number }
  | { type: "widget" }
  | { type: "api" };

export interface OutboundMessage {
  platform: Platform;
  text: string;
  replyTo: ReplyTarget;
}
