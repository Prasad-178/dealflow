const FALLBACK_RESPONSES: Record<string, string> = {
  confidential:
    "I appreciate your interest! That's something I'd need to connect you with our team to discuss in detail. Would you like to schedule a call?",
  inappropriate:
    "I want to make sure we keep our conversation productive. How can I help you with our product today?",
  competitor_bashing:
    "I'd prefer to focus on how our solution can help you rather than comparing with others. What specific challenges are you looking to solve?",
  false_claims:
    "Let me make sure I give you accurate information. I'll look that up for you.",
  over_promising:
    "I want to set realistic expectations. Let me connect you with our team to discuss your specific requirements and what we can deliver.",
  pressure_tactics:
    "I want you to feel comfortable with any decision. Take the time you need, and I'm here whenever you're ready to discuss further.",
  unauthorized_commitments:
    "That's a great question about customization. I'd need to check with our team on that specific request. Can I get back to you?",
  default:
    "I'd be happy to help you with that. Could you tell me more about what you're looking for?",
};

export function getFallbackResponse(category: string): string {
  return FALLBACK_RESPONSES[category] || FALLBACK_RESPONSES.default;
}
