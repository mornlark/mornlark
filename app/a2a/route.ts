import { handleA2a } from "@/lib/agents/a2a";
import { json } from "@/lib/agents/http";
export const POST = handleA2a;
export function GET() {
  return json(
    {
      error:
        "Use POST with A2A 1.0 JSON-RPC. The Agent Card is at /.well-known/agent-card.json.",
    },
    405,
    { Allow: "POST" },
  );
}
