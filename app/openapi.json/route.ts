import { openApiDocument } from "@/lib/agents/openapi";
import { json } from "@/lib/agents/http";
export function GET() {
  return json(openApiDocument(), 200, {
    "Content-Type": "application/vnd.oai.openapi+json; charset=utf-8",
    "Cache-Control": "public, max-age=300",
  });
}
