import { products, money } from "@/app/catalog";
import { absoluteUrl } from "./site";

const escape = (text: string) => text.replace(/[\\`*_{}\[\]<>#|]/g, "\\$&");

export function homepageMarkdown() {
  return `# MornLark\n\nRobots for home, work and companionship.\n\nThis is an illustrative catalog. Checkout is a preview: no payment is collected and no products are shipped.\n\n## The robot collection\n\n${products
    .map(
      (product) =>
        `### ${escape(product.name)}\n\n${escape(product.tagline)}\n\n- Price: ${money(product.price)} USD\n- Category: ${escape(product.category)}\n${product.features.map((feature) => `- ${escape(feature)}`).join("\n")}\n\n${escape(product.description)}\n\n[View catalog](${absoluteUrl("/#robots")})`,
    )
    .join(
      "\n\n",
    )}\n\n## Agent access\n\n- [API documentation](${absoluteUrl("/docs/agents.md")})\n- [OpenAPI document](${absoluteUrl("/openapi.json")})\n- [API catalog](${absoluteUrl("/.well-known/api-catalog")})\n- [Authentication and registration](${absoluteUrl("/auth.md")})\n- [Agent skills](${absoluteUrl("/.well-known/agent-skills/index.json")})\n\n## Content preferences\n\nSearch and agent input are allowed. AI training is not allowed.\n`;
}

export const authMarkdown = `# MornLark auth.md

## Agent audience

Agents may browse the public illustrative robot catalog and calculate sandbox quotes. These services do not place orders or charge money.

## Supported registration method: anonymous

Public catalog, quote, MCP and A2A access does not require an account or a bearer token. Optional provisioning is available at POST ${absoluteUrl("/api/agent/register")} with Content-Type: application/json and a body such as {"name":"catalog-assistant"}.

The response is an anonymous capability handshake, not a verified identity or a customer account. No credential is issued or required. Do not send email addresses, passwords or payment credentials. The supplied display name is not retained.

- Identity type: anonymous
- Credential types supported: none
- Claim URI: ${absoluteUrl("/api/agent/register")}
- Scopes: catalog:read, quote:preview
- Credential use: none; public requests omit Authorization

OAuth is not offered by this public sandbox. There is no OAuth issuer, authorization server or protected resource metadata to discover. Payment signatures are not OAuth bearer credentials and do not grant access to private customer data.

## Endpoints

- GET ${absoluteUrl("/api/products")}
- GET ${absoluteUrl("/api/products/{id}")}
- POST ${absoluteUrl("/api/quote")}
- POST ${absoluteUrl("/mcp")}
- POST ${absoluteUrl("/a2a")}

See [the API documentation](${absoluteUrl("/docs/agents.md")}) for request schemas, supported versions and sandbox payment configuration.
`;

export function prefersMarkdown(accept: string | null) {
  if (!accept) return false;
  const ranges = accept
    .toLowerCase()
    .split(",")
    .map((part) => {
      const [type, ...params] = part.trim().split(";");
      const quality = params
        .map((value) => value.trim())
        .find((value) => value.startsWith("q="));
      const q = quality === undefined ? 1 : Number(quality.slice(2));
      return { type, q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0 };
    });
  const score = (type: string) => {
    const matches = ranges.filter((range) =>
      [type, "text/*", "*/*"].includes(range.type),
    );
    const exact = matches.filter((range) => range.type === type);
    const text = matches.filter((range) => range.type === "text/*");
    return Math.max(
      0,
      ...(exact.length ? exact : text.length ? text : matches).map(
        (range) => range.q,
      ),
    );
  };
  const explicit = ranges.some(
    (range) => range.type === "text/markdown" && range.q > 0,
  );
  return explicit && score("text/markdown") >= score("text/html");
}
