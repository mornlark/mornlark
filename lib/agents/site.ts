export const SITE_ORIGIN = "https://mornlark.com";
export const AGENT_VERSION = "1.0.0";
export const CONTENT_SIGNAL = "ai-train=no, search=yes, ai-input=yes";
export const AP2_EXTENSION =
  "https://github.com/google-agentic-commerce/AP2/tree/v0.1.0";

export const absoluteUrl = (path: string) => new URL(path, SITE_ORIGIN).href;

export const DISCOVERY_LINKS = [
  "<" +
    absoluteUrl("/.well-known/api-catalog") +
    '>; rel="api-catalog"; type="application/linkset+json"',
  "<" +
    absoluteUrl("/openapi.json") +
    '>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  "<" +
    absoluteUrl("/docs/agents.md") +
    '>; rel="service-doc"; type="text/markdown"',
  "<" + absoluteUrl("/auth.md") + '>; rel="describedby"; type="text/markdown"',
].join(", ");
