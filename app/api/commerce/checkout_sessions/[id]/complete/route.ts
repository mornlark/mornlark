import { json } from "@/lib/agents/http";
export function POST() {
  return json(
    {
      type: "about:blank",
      title: "Live checkout is disabled",
      status: 409,
      mode: "sandbox",
      payment_execution: false,
      detail:
        "This service provides previews only. A merchant processor, durable order store and verified payment mandates are required before completion can be enabled.",
    },
    409,
    { "Content-Type": "application/problem+json" },
  );
}
