import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  createQuote,
  getProduct,
  searchInput,
  searchProducts,
  quoteInput,
  productIdInput,
  AgentError,
} from "./catalog";
import { checkOrigin, problem, publicHeaders } from "./http";
import { AGENT_VERSION, absoluteUrl } from "./site";

const result = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
});
const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export function createMcpServer() {
  const server = new McpServer(
    { name: "com.mornlark/catalog", version: AGENT_VERSION },
    {
      instructions:
        "Browse MornLark's illustrative robot catalog and calculate sandbox quotes. No tool places orders, collects payment, or accesses private customer data.",
    },
  );
  server.registerTool(
    "search_robots",
    {
      description:
        "Search the illustrative robot catalog. Prices are in USD; maxPrice uses dollars.",
      inputSchema: searchInput.shape,
      annotations,
    },
    (input) => result(searchProducts(input)),
  );
  server.registerTool(
    "get_robot",
    {
      description:
        "Get one robot's illustrative price, description and specifications.",
      inputSchema: productIdInput.shape,
      annotations,
    },
    ({ id }) => {
      try {
        return result(getProduct(id));
      } catch {
        return { ...result({ error: "Product not found." }), isError: true };
      }
    },
  );
  server.registerTool(
    "preview_quote",
    {
      description:
        "Calculate an illustrative quote in USD minor units. Does not create an order or collect payment.",
      inputSchema: quoteInput.shape,
      annotations,
    },
    (input) => {
      try {
        return result(createQuote(input));
      } catch (error) {
        return {
          ...result({
            error:
              error instanceof AgentError
                ? error.message
                : "Invalid quote items.",
          }),
          isError: true,
        };
      }
    },
  );
  server.registerResource(
    "robot-catalog",
    absoluteUrl("/api/products"),
    {
      description:
        "Public illustrative catalog, updated from the storefront's product data.",
      mimeType: "application/json",
    },
    (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(searchProducts()),
        },
      ],
    }),
  );
  server.registerPrompt(
    "choose-robot",
    {
      description:
        "Compare the catalog against a user's needs without inventing product claims.",
      argsSchema: { needs: z.string().max(500) },
    },
    ({ needs }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Compare these illustrative robots for the following needs: ${needs}\nUse only the supplied specifications. All prices and products are illustrative; do not place an order.\n${JSON.stringify(searchProducts())}`,
          },
        },
      ],
    }),
  );
  return server;
}

export async function handleMcp(request: Request) {
  try {
    checkOrigin(request);
    const host = new URL(request.url).hostname;
    if (!["mornlark.com", "localhost", "127.0.0.1", "[::1]"].includes(host))
      throw new AgentError(403, "Unsupported host.");
    const server = createMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      maxRequestBodySize: 32_768,
    });
    try {
      await server.connect(transport);
      const response = await transport.handleRequest(request);
      Object.entries(publicHeaders).forEach(([key, value]) =>
        response.headers.set(key, value),
      );
      response.headers.set("Cache-Control", "no-store");
      return response;
    } finally {
      await server.close();
    }
  } catch (error) {
    return problem(error);
  }
}
