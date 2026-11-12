import { agentDocs } from "@/lib/agents/docs";
import { markdown } from "@/lib/agents/http";
export function GET() { return markdown(agentDocs); }
