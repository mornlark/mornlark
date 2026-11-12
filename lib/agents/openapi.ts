import { AGENT_VERSION, AP2_EXTENSION, SITE_ORIGIN } from "./site";

const jsonResponse = (
  schema: Record<string, unknown>,
  description = "Success",
) => ({ description, content: { "application/json": { schema } } });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const errorResponses = {
  "400": jsonResponse(ref("Problem"), "Invalid input"),
  "413": jsonResponse(ref("Problem"), "Request exceeds 32 KiB"),
  "415": jsonResponse(ref("Problem"), "Use application/json"),
};

export function openApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "MornLark public agent and sandbox API",
      version: AGENT_VERSION,
      description:
        "Public illustrative robot catalog, quotes, discovery and explicitly sandbox-only commerce. No endpoint places a real order or charges real money.",
    },
    servers: [{ url: SITE_ORIGIN }],
    "x-service-info": { categories: ["robotics", "catalog", "sandbox"] },
    "x-environment": "sandbox",
    paths: {
      "/api/products": {
        get: {
          operationId: "searchRobots",
          summary: "Search illustrative robots",
          parameters: [
            {
              name: "q",
              in: "query",
              schema: { type: "string", maxLength: 200 },
            },
            {
              name: "category",
              in: "query",
              schema: {
                type: "string",
                enum: [
                  "All robots",
                  "Home & living",
                  "Companions",
                  "Work & industry",
                ],
              },
            },
            {
              name: "maxPrice",
              in: "query",
              description: "Maximum price in USD dollars",
              schema: { type: "number", minimum: 0, maximum: 1000000 },
            },
            {
              name: "sort",
              in: "query",
              schema: {
                type: "string",
                enum: ["featured", "price-low", "price-high"],
              },
            },
          ],
          responses: {
            "200": jsonResponse(ref("Catalog")),
            "400": errorResponses["400"],
          },
        },
      },
      "/api/products/{id}": {
        get: {
          operationId: "getRobot",
          summary: "Retrieve one illustrative robot",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", maxLength: 64 },
            },
          ],
          responses: {
            "200": jsonResponse(ref("Product")),
            "404": jsonResponse(ref("Problem"), "Product not found"),
          },
        },
      },
      "/api/quote": {
        post: {
          operationId: "previewQuote",
          summary: "Calculate a sandbox quote",
          requestBody: {
            required: true,
            content: { "application/json": { schema: ref("QuoteInput") } },
          },
          responses: {
            "200": jsonResponse(ref("Quote")),
            ...errorResponses,
            "404": jsonResponse(ref("Problem"), "Unknown product"),
          },
        },
      },
      "/api/agent/register": {
        post: {
          operationId: "anonymousAgentHandshake",
          summary:
            "Optional anonymous capability handshake; no account or credential is created",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    name: { type: "string", minLength: 1, maxLength: 80 },
                  },
                },
              },
            },
          },
          responses: {
            "200": jsonResponse({
              type: "object",
              properties: {
                identity_type: { const: "anonymous" },
                account_created: { const: false },
              },
            }),
            ...errorResponses,
          },
        },
      },
      "/api/health": {
        get: {
          operationId: "health",
          summary: "Public service health",
          responses: {
            "200": jsonResponse({
              type: "object",
              properties: {
                status: { const: "ok" },
                live_payments: { const: false },
              },
              required: ["status", "live_payments"],
            }),
          },
        },
      },
      "/api/commerce/checkout_sessions": {
        post: {
          operationId: "createCheckoutPreview",
          summary:
            "Create a signed checkout preview; payment completion is disabled",
          requestBody: {
            required: true,
            content: { "application/json": { schema: ref("QuoteInput") } },
          },
          responses: {
            "201": jsonResponse(ref("CheckoutPreview")),
            ...errorResponses,
            "503": jsonResponse(
              ref("Problem"),
              "Server signing secrets have not been configured",
            ),
          },
        },
      },
      "/api/commerce/checkout_sessions/{id}": {
        get: {
          operationId: "getCheckoutPreview",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", maxLength: 4096 },
            },
          ],
          responses: {
            "200": jsonResponse(ref("CheckoutPreview")),
            "404": jsonResponse(ref("Problem"), "Invalid preview"),
            "410": jsonResponse(ref("Problem"), "Expired preview"),
            "503": jsonResponse(
              ref("Problem"),
              "Server signing secrets have not been configured",
            ),
          },
        },
      },
      "/api/commerce/checkout_sessions/{id}/complete": {
        post: {
          operationId: "checkoutCompletionDisabled",
          description:
            "Always rejects real checkout. This sandbox has no merchant payment processor, durable order store or fulfillment service.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "409": jsonResponse(ref("Problem"), "Live checkout is disabled"),
          },
        },
      },
      "/api/payments/mpp": {
        get: {
          operationId: "mppTestResource",
          summary: "MPP-protected test resource, Tempo testnet only",
          description:
            "Requires explicit test-payment configuration. No production payment network is supported. The catalog remains free.",
          "x-payment-info": {
            intent: "charge",
            method: "tempo",
            amount: "1000",
            currency: "0x20c0000000000000000000006a37DA5C996874BE",
            description: "0.001 test OUSD on Tempo testnet; not real money.",
          },
          "x-sandbox": true,
          responses: {
            "200": jsonResponse({
              type: "object",
              properties: { mode: { const: "sandbox" } },
            }),
            "402": {
              description:
                "MPP challenge in WWW-Authenticate; a verified testnet credential is required",
            },
            "503": jsonResponse(
              ref("Problem"),
              "Test payment configuration is disabled or unavailable",
            ),
          },
        },
      },
      "/api/payments/x402": {
        get: {
          operationId: "x402TestResource",
          summary: "x402-protected test resource, Base Sepolia only",
          "x-sandbox": true,
          "x-x402": {
            network: "eip155:84532",
            scheme: "exact",
            price: "$0.001",
            facilitator: "https://x402.org/facilitator",
          },
          responses: {
            "200": jsonResponse({
              type: "object",
              properties: { mode: { const: "sandbox" } },
            }),
            "402": {
              description:
                "x402 v2 payment requirements in PAYMENT-REQUIRED; verified testnet payment required",
            },
            "503": jsonResponse(
              ref("Problem"),
              "Test payment configuration is disabled or unavailable",
            ),
          },
        },
      },
      "/a2a": {
        post: {
          operationId: "a2aSendMessage",
          description: `A2A 1.0 JSON-RPC SendMessage; acknowledge ${AP2_EXTENSION} in A2A-Extensions. AP2 discovery is sandbox-only; payment execution is disabled.`,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["jsonrpc", "id", "method", "params"],
                  properties: {
                    jsonrpc: { const: "2.0" },
                    id: { type: ["string", "number"] },
                    method: { const: "SendMessage" },
                    params: { type: "object" },
                  },
                },
              },
            },
          },
          responses: {
            "200": jsonResponse({ type: "object" }),
            ...errorResponses,
          },
        },
      },
      "/mcp": {
        post: {
          operationId: "mcp",
          description:
            "Stateless MCP Streamable HTTP. Negotiate protocol version during initialize; see the server card.",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object" } } },
          },
          responses: {
            "200": jsonResponse({ type: "object" }),
            "202": { description: "Notification accepted" },
            ...errorResponses,
          },
        },
      },
    },
    components: {
      schemas: {
        Problem: {
          type: "object",
          properties: {
            type: { type: "string" },
            title: { type: "string" },
            status: { type: "integer" },
            detail: { type: "string" },
          },
          required: ["title", "status"],
        },
        Product: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            summary: { type: "string" },
            category: { type: "string" },
            features: { type: "array", items: { type: "string" } },
            url: { type: "string", format: "uri" },
            illustrative: { const: true },
            price: {
              type: "object",
              properties: {
                amount: { type: "integer", minimum: 0 },
                currency: { const: "USD" },
                unit: { const: "minor" },
              },
              required: ["amount", "currency", "unit"],
            },
          },
          required: ["id", "name", "price", "illustrative"],
        },
        Catalog: {
          type: "object",
          properties: {
            mode: { const: "sandbox" },
            currency: { const: "USD" },
            total: { type: "integer", minimum: 0 },
            products: { type: "array", items: ref("Product") },
          },
          required: ["mode", "currency", "total", "products"],
        },
        QuoteInput: {
          type: "object",
          additionalProperties: false,
          required: ["items"],
          properties: {
            items: {
              type: "array",
              minItems: 1,
              maxItems: 20,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "quantity"],
                properties: {
                  id: { type: "string", minLength: 1, maxLength: 64 },
                  quantity: { type: "integer", minimum: 1, maximum: 99 },
                },
              },
            },
          },
        },
        Quote: {
          type: "object",
          properties: {
            mode: { const: "sandbox" },
            currency: { const: "USD" },
            unit: { const: "minor" },
            items: { type: "array", items: { type: "object" } },
            total_amount: { type: "integer", minimum: 0 },
            payment_required: { const: false },
            fulfillment_available: { const: false },
          },
          required: [
            "mode",
            "currency",
            "unit",
            "items",
            "total_amount",
            "payment_required",
            "fulfillment_available",
          ],
        },
        CheckoutPreview: {
          type: "object",
          properties: {
            id: { type: "string" },
            mode: { const: "sandbox" },
            status: { const: "not_ready_for_payment" },
            quote: ref("Quote"),
            signed_preview: { type: "string" },
            payment_execution: { const: false },
          },
          required: [
            "id",
            "mode",
            "status",
            "quote",
            "signed_preview",
            "payment_execution",
          ],
        },
      },
    },
  };
}
