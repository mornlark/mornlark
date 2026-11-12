import { json } from "@/lib/agents/http";
import { AGENT_VERSION } from "@/lib/agents/site";
export function GET() {
  return json({
    status: "ok",
    version: AGENT_VERSION,
    mode: "sandbox",
    live_payments: false,
  });
}
