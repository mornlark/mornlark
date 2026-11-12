import { createHash } from "node:crypto";
import { absoluteUrl } from "./site";

export const skills = [
  {
    name: "mornlark-catalog",
    description:
      "Search the illustrative MornLark robot catalog and inspect specifications.",
    content: `---
name: mornlark-catalog
description: Search the illustrative MornLark robot catalog and inspect specifications.
---
# MornLark catalog

Use this skill when a user wants to browse MornLark robots or compare their stated features.

1. GET ${absoluteUrl("/api/products")} to list products. Optional query parameters: q, category, maxPrice (USD dollars), sort (featured, price-low, price-high).
2. GET ${absoluteUrl("/api/products/{id}")} for one product.
3. Prices in API responses use USD minor units. Products, prices and specifications are illustrative.
4. Do not invent customer reviews, availability, safety certifications or fulfillment guarantees.

MCP endpoint: ${absoluteUrl("/mcp")}. Tools: search_robots and get_robot.
Browser tools also support search_robots, get_robot, view_robot and navigate_store when WebMCP is available.
No registration or credential is required for public catalog reads. See ${absoluteUrl("/auth.md")}.
`,
  },
  {
    name: "mornlark-quote",
    description:
      "Calculate a sandbox robot quote without charging money or placing an order.",
    content: `---
name: mornlark-quote
description: Calculate a sandbox robot quote without charging money or placing an order.
---
# MornLark quote preview

Use this skill when a user wants the cost of a selection from the illustrative catalog.

POST ${absoluteUrl("/api/quote")} with Content-Type: application/json and a body such as {"items":[{"id":"miko","quantity":1}]}.
Use existing catalog IDs and integer quantities from 1 to 99. The server calculates prices from its own catalog; never submit a client-calculated price.

Amounts in the response are USD minor units. Tax is not calculated. This is a preview, not an order, reservation or payment authorization.
MCP and browser tool: preview_quote. No credential is required.

Sandbox checkout and test-network payment details: ${absoluteUrl("/docs/agents.md")}.
Do not attempt real payments or promise shipment. Never send card numbers or personal data to sandbox endpoints.
`,
  },
] as const;

export function skillsIndex() {
  return {
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: skills.map((skill) => ({
      name: skill.name,
      type: "skill-md",
      description: skill.description,
      url: absoluteUrl(`/.well-known/agent-skills/${skill.name}/SKILL.md`),
      digest: `sha256:${createHash("sha256").update(skill.content, "utf8").digest("hex")}`,
    })),
  };
}
