import { mcpCard } from "@/lib/agents/discovery";
import { json } from "@/lib/agents/http";
export function GET() {
  return json(mcpCard(), 200, { "Cache-Control": "public, max-age=300" });
}
