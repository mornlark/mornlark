import {
  acpDiscovery,
  agentCard,
  apiCatalog,
  legacyMcpCard,
  ucpDiscovery,
} from "@/lib/agents/discovery";
import { publicJwks } from "@/lib/agents/signing";
import { skills, skillsIndex } from "@/lib/agents/skills";
import { json, markdown } from "@/lib/agents/http";

export async function GET(
  _request: Request,
  context: RouteContext<"/.well-known/[...resource]">,
) {
  const path = (await context.params).resource.join("/");
  const headers = { "Cache-Control": "public, max-age=300" };
  if (path === "api-catalog")
    return json(apiCatalog(), 200, {
      ...headers,
      "Content-Type":
        'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
    });
  if (path === "agent-card.json") return json(agentCard(), 200, headers);
  if (path === "mcp/server-card.json")
    return json(legacyMcpCard(), 200, headers);
  if (path === "agent-skills/index.json")
    return json(skillsIndex(), 200, headers);
  const skill = skills.find(
    (skill) => path === `agent-skills/${skill.name}/SKILL.md`,
  );
  if (skill) return markdown(skill.content);
  if (path === "http-message-signatures-directory")
    return json(publicJwks(), 200, {
      ...headers,
      "Content-Type": "application/http-message-signatures-directory+json",
    });
  if (path === "acp.json") return json(acpDiscovery(), 200, headers);
  if (path === "ucp") return json(ucpDiscovery(), 200, headers);
  return json({ error: "Discovery resource not found." }, 404);
}
