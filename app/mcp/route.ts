import { handleMcp } from "@/lib/agents/mcp";
import { json } from "@/lib/agents/http";
export const POST = handleMcp;
export function GET() {
  return json(
    {
      error:
        "This stateless MCP endpoint accepts POST requests. Discovery is available at /mcp/server-card.",
    },
    405,
    { Allow: "POST" },
  );
}
export const DELETE = GET;
