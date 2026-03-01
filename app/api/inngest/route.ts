import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  processWebhookMessage,
  extractMemories,
} from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processWebhookMessage, extractMemories],
});
