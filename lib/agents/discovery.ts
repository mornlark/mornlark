import { AGENT_VERSION, AP2_EXTENSION, absoluteUrl } from "./site";
import { publicJwks } from "./signing";

export function apiCatalog() {
  return {
    linkset: ["/api/products", "/api/commerce", "/api/ucp", "/mcp", "/a2a"].map(
      (path) => ({
        anchor: absoluteUrl(path),
        "service-desc": [
          {
            href: absoluteUrl("/openapi.json"),
            type: "application/vnd.oai.openapi+json",
          },
        ],
        "service-doc": [
          { href: absoluteUrl("/docs/agents.md"), type: "text/markdown" },
        ],
        status: [
          { href: absoluteUrl("/api/health"), type: "application/json" },
        ],
      }),
    ),
  };
}

export function mcpCard() {
  return {
    $schema:
      "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
    name: "com.mornlark/catalog",
    title: "MornLark catalog",
    version: AGENT_VERSION,
    description:
      "Search illustrative robots and calculate sandbox quotes without orders or payments.",
    websiteUrl: absoluteUrl("/"),
    remotes: [
      {
        type: "streamable-http",
        url: absoluteUrl("/mcp"),
        supportedProtocolVersions: ["2025-11-25", "2025-06-18", "2025-03-26"],
      },
    ],
    repository: {
      source: "github",
      url: "https://github.com/mornlark/mornlark",
    },
  };
}

export function legacyMcpCard() {
  return {
    serverInfo: { name: "com.mornlark/catalog", version: AGENT_VERSION },
    protocolVersion: "2025-11-25",
    endpoint: absoluteUrl("/mcp"),
    transport: { type: "streamable-http", endpoint: absoluteUrl("/mcp") },
    capabilities: { tools: {}, resources: {}, prompts: {} },
    documentationUrl: absoluteUrl("/docs/agents.md"),
    instructions:
      "Public illustrative catalog and quote previews. No credentials, real orders or payments.",
    canonicalServerCard: absoluteUrl("/mcp/server-card"),
  };
}

export function agentCard() {
  return {
    name: "MornLark catalog assistant",
    version: AGENT_VERSION,
    description:
      "Search the illustrative robot catalog and calculate sandbox quotes. No orders are placed and no payment is executed.",
    supportedInterfaces: [
      {
        url: absoluteUrl("/a2a"),
        protocolBinding: "JSONRPC",
        protocolVersion: "1.0",
      },
    ],
    capabilities: {
      streaming: false,
      pushNotifications: false,
      extensions: [
        {
          uri: AP2_EXTENSION,
          required: true,
          description:
            "Merchant-role discovery in a sandbox. Acknowledgment is required; this service cannot execute payments or fulfill orders.",
          params: {
            roles: ["merchant"],
            environment: "sandbox",
            payment_execution: false,
          },
        },
      ],
    },
    defaultInputModes: ["text/plain", "application/json"],
    defaultOutputModes: ["application/json", "text/plain"],
    documentationUrl: absoluteUrl("/docs/agents.md"),
    skills: [
      {
        id: "search-robots",
        name: "Search robots",
        description:
          "Search the illustrative catalog with a search_robots data part or a plain search phrase.",
        tags: ["catalog", "robots", "sandbox"],
      },
      {
        id: "get-robot",
        name: "Get robot details",
        description:
          "Use a get_robot data part with a catalog product ID to retrieve its specifications.",
        tags: ["catalog", "specifications"],
      },
      {
        id: "preview-quote",
        name: "Preview a quote",
        description:
          "Use a preview_quote data part with items. Calculates a total without buying or paying.",
        tags: ["quote", "sandbox"],
      },
    ],
  };
}

export function acpDiscovery() {
  return {
    protocol: { name: "acp", version: "2026-04-17" },
    api_base_url: absoluteUrl("/api/commerce"),
    transports: ["rest", "mcp"],
    capabilities: {
      services: ["catalog", "quote", "checkout_preview"],
      payment_execution: false,
      order_fulfillment: false,
    },
    endpoints: {
      catalog: absoluteUrl("/api/products"),
      quote: absoluteUrl("/api/quote"),
      checkout_preview: absoluteUrl("/api/commerce/checkout_sessions"),
      mcp: absoluteUrl("/mcp"),
    },
    mode: "sandbox",
    profile: "discovery-and-preview",
    description:
      "ACP discovery for illustrative catalog and preview services. This is not a production ACP checkout or payment processor.",
    documentation_url: absoluteUrl("/docs/agents.md"),
    openapi_url: absoluteUrl("/openapi.json"),
  };
}

export function ucpDiscovery() {
  const services = {
    "com.mornlark.catalog": [
      {
        version: AGENT_VERSION,
        spec: absoluteUrl("/docs/agents.md"),
        transport: "rest",
        endpoint: absoluteUrl("/api/ucp"),
        schema: absoluteUrl("/openapi.json"),
      },
    ],
  };
  const capabilities = {
    "com.mornlark.catalog.search": [
      {
        version: AGENT_VERSION,
        spec: absoluteUrl("/docs/agents.md"),
        schema: absoluteUrl("/schemas/catalog.json"),
      },
    ],
  };
  return {
    ucp: {
      version: "2026-08-25",
      services,
      capabilities,
      payment_handlers: {},
    },
    protocol_version: "2026-08-25",
    services,
    capabilities,
    endpoints: {
      rest: absoluteUrl("/api/ucp"),
      catalog: absoluteUrl("/api/products"),
      quote: absoluteUrl("/api/quote"),
    },
    mode: "sandbox",
    payment_execution: false,
    keys: publicJwks().keys,
  };
}
