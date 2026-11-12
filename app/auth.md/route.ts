import { authMarkdown } from "@/lib/agents/content";
import { markdown } from "@/lib/agents/http";
export function GET() {
  return markdown(authMarkdown);
}
