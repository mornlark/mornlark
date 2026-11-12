import { json } from "@/lib/agents/http";
import { absoluteUrl } from "@/lib/agents/site";
export function GET() {
  return json({
    mode: "sandbox",
    services: ["catalog", "quote", "checkout_preview"],
    catalog: absoluteUrl("/api/products"),
    quote: absoluteUrl("/api/quote"),
    checkout_preview: absoluteUrl("/api/commerce/checkout_sessions"),
    payment_execution: false,
  });
}
