import { json } from "@/lib/agents/http";
import { absoluteUrl } from "@/lib/agents/site";
export function GET() {
  return json({
    mode: "sandbox",
    protocol_version: "2026-08-25",
    services: ["com.mornlark.catalog"],
    endpoints: {
      search: absoluteUrl("/api/products"),
      quote: absoluteUrl("/api/quote"),
      checkout_preview: absoluteUrl("/api/commerce/checkout_sessions"),
    },
    payment_execution: false,
  });
}
