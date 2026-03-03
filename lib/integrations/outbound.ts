import type { OutboundMessage } from "./types";
import { sendEmail } from "./email";
import { sendSlackMessage } from "./slack";
import { sendTelegramMessage } from "./telegram";
import { logger } from "@/lib/logger";

const log = logger.create("integrations:outbound");

/**
 * Route an outbound message to the correct platform sender.
 * Widget and API platforms are no-ops (response is returned inline).
 */
export async function sendOutboundMessage(
  msg: OutboundMessage
): Promise<boolean> {
  switch (msg.platform) {
    case "email":
      return sendEmail(msg);
    case "slack":
      return sendSlackMessage(msg);
    case "telegram":
      return sendTelegramMessage(msg);
    case "widget":
    case "api":
      // These platforms receive responses inline, not via push
      return true;
    default:
      log.warn("Unknown platform", { platform: msg.platform });
      return false;
  }
}
