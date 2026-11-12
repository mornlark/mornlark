import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AgentError, createQuote, quoteInput } from "./catalog";
import { sealSession, signSandboxDocument, unsealSession } from "./signing";
import { absoluteUrl } from "./site";

const sessionSchema = z
  .object({
    version: z.literal(1),
    mode: z.literal("sandbox"),
    nonce: z.string().uuid(),
    expires: z.number().int().positive(),
    items: quoteInput.shape.items,
  })
  .strict();

function preview(id: string, session: z.infer<typeof sessionSchema>) {
  if (session.expires <= Math.floor(Date.now() / 1000))
    throw new AgentError(410, "Checkout preview has expired.");
  const quote = createQuote({ items: session.items });
  return {
    id,
    mode: "sandbox",
    status: "not_ready_for_payment",
    currency: "usd",
    expires_at: new Date(session.expires * 1000).toISOString(),
    line_items: quote.items,
    totals: [
      { type: "subtotal", amount: quote.subtotal_amount },
      { type: "total", amount: quote.total_amount },
    ],
    quote,
    signed_preview: signSandboxDocument({
      quote,
      checkout_preview: id,
      exp: session.expires,
    }),
    continue_url: absoluteUrl("/#robots"),
    payment_execution: false,
    fulfillment_available: false,
    messages: [
      {
        type: "info",
        code: "sandbox_only",
        content:
          "This is an illustrative checkout preview. No payment can be collected and no order is placed.",
      },
    ],
  };
}

export function createCheckoutPreview(input: unknown) {
  const { items } = quoteInput.parse(input);
  createQuote({ items });
  const session = {
    version: 1 as const,
    mode: "sandbox" as const,
    nonce: randomUUID(),
    expires: Math.floor(Date.now() / 1000) + 900,
    items,
  };
  const id = sealSession(session);
  return preview(id, session);
}

export function getCheckoutPreview(id: string) {
  const session = sessionSchema.parse(unsealSession(id));
  return preview(id, session);
}
