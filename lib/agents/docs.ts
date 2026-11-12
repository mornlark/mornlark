import { AP2_EXTENSION, absoluteUrl } from "./site";

export const agentDocs = `# MornLark agent API

MornLark's public catalog contains illustrative robots, prices and specifications. Public catalog reads and quote calculations are anonymous and free. There are no real orders, reservations, shipments or charges.

## Discovery and content

- Homepage: request Accept: text/markdown for Markdown. HTML is the default. Markdown responses use Vary: Accept. HTML is private, no-store because Next's page renderer replaces custom Vary headers. Both variants include registered discovery Link relations.
- Markdown URL: ${absoluteUrl("/index.md")}
- API catalog: ${absoluteUrl("/.well-known/api-catalog")}
- OpenAPI 3.1: ${absoluteUrl("/openapi.json")}
- Registration: ${absoluteUrl("/auth.md")}
- Skills: ${absoluteUrl("/.well-known/agent-skills/index.json")}; verify SHA-256 against the fetched artifact bytes.
- Content Signals: ai-train=no, search=yes, ai-input=yes.

## Public API

| Method | Path | Behavior |
| --- | --- | --- |
| GET | /api/products | Filter using q, category, maxPrice and sort |
| GET | /api/products/{id} | Get one product |
| POST | /api/quote | Calculate a preview with {"items":[{"id":"miko","quantity":1}]} |
| GET | /api/health | Read public service health |
| POST | /api/agent/register | Optional anonymous handshake, no account or credential issued |

Use Content-Type: application/json for POST requests. Bodies are limited to 32 KiB. Quantities are integers from 1 to 99; duplicate lines are combined, capped at 99 per product. Unknown products and invalid inputs are rejected. maxPrice uses USD dollars; returned monetary amounts are integer USD minor units. Tax is not calculated. Prices always come from the server's catalog.

## MCP

Endpoint: POST ${absoluteUrl("/mcp")} with Accept: application/json, text/event-stream.
MCP Streamable HTTP is stateless and returns JSON. Supported advertised protocol versions: 2025-11-25, 2025-06-18, 2025-03-26. Initialize with a supported version before using tools. GET and DELETE are not offered; streaming and resumable sessions are not offered.

Tools: search_robots, get_robot, preview_quote.
Resource: ${absoluteUrl("/api/products")}.
Prompt: choose-robot with a needs string.

Current MCP Server Card: ${absoluteUrl("/mcp/server-card")}.
The requested legacy discovery path ${absoluteUrl("/.well-known/mcp/server-card.json")} also publishes the older serverInfo/transport/capabilities shape. The current SEP-2127 uses the separate current card shape and runtime primitive discovery.

## A2A and AP2 discovery

Agent Card: ${absoluteUrl("/.well-known/agent-card.json")}.
Use A2A 1.0 JSON-RPC SendMessage at POST ${absoluteUrl("/a2a")}.
Set A2A-Version: 1.0 and A2A-Extensions: ${AP2_EXTENSION}.

Example request:

\`\`\`json
{"jsonrpc":"2.0","id":1,"method":"SendMessage","params":{"message":{"messageId":"example-1","role":"ROLE_USER","parts":[{"data":{"action":"search_robots","filters":{"query":"desk"}}}]}}}
\`\`\`

Other structured actions are get_robot with id, and preview_quote with items. Plain text is treated as a catalog search. Responses contain a Message, not a persisted Task. Streaming, notifications, private customer data and payment execution are not supported.

The AP2 extension declares the merchant role and requires explicit acknowledgment. Its params mark sandbox mode and payment_execution=false. Extension discovery does not mean that production mandates, merchant processing or settlement have been configured. Signed checkout previews are MornLark preview JWTs, not AP2 payment mandates. This service never treats a preview signature as authority to charge.

## Sandbox commerce discovery

ACP discovery: ${absoluteUrl("/.well-known/acp.json")}. The profile identifies catalog, quote and checkout-preview services and explicitly disables payment execution and fulfillment; it does not claim a complete production ACP checkout implementation.

UCP discovery: ${absoluteUrl("/.well-known/ucp")}. The current ucp envelope advertises MornLark's own com.mornlark.catalog service and search capability, with empty payment handlers. Top-level compatibility fields are included for the requested scanner format. No dev.ucp.shopping.checkout capability is claimed.

POST /api/commerce/checkout_sessions with the quote input creates a signed, 15-minute preview; GET /api/commerce/checkout_sessions/{id} reads it. Server secrets must be configured first. No personal information is accepted or retained. Session IDs contain signed product selections only. Completion always returns HTTP 409. Previews are stateless and are not durable order records.

## MPP and x402 test resources

Both integrations are disabled unless AGENT_ENABLE_TEST_PAYMENTS=1 and their server configuration is present. An unconfigured resource returns HTTP 503, not fabricated payment success. These routes are separate from the free catalog and quote API.

- GET /api/payments/mpp: MPP tempo charge, 0.001 test OUSD (1000 minor units), Tempo testnet only. Requires MPP_SECRET_KEY and MPP_RECIPIENT. Payment discovery is on this OpenAPI operation's x-payment-info.
- GET /api/payments/x402: official @x402/next middleware, exact $0.001 test USDC on Base Sepolia (eip155:84532). Requires X402_PAY_TO and an HTTPS facilitator; the default is https://x402.org/facilitator. Unsigned requests return HTTP 402, verified requests receive only a sandbox resource.

No mainnet switch or production order completion is exposed. Test-network settlement requires the caller's explicit signed test-payment credential. Test-payment replay storage is local to a single server process; keep these demonstration routes disabled on multi-instance hosting until a shared replay store and production merchant integration are supplied.

## WebMCP

On page load the storefront registers search_robots, get_robot, view_robot, navigate_store and preview_quote when a native modelContext API is available. It supports the early navigator.modelContext location and the current document.modelContext location. AbortController cleanup removes tools on unmount. Unsupported browsers keep the normal storefront; the site does not install a fake API or claim registration happened.

Browser tools do not purchase products, mutate the shopping bag or expose stored customer information.

## Web Bot Auth

Public keys: ${absoluteUrl("/.well-known/http-message-signatures-directory")}.
The server-side agentFetch helper signs outbound agent requests using Ed25519 HTTP Message Signatures, including Signature-Agent and Signature-Input. POST bodies are covered with Content-Digest. Signatures expire after 60 seconds and redirects are not followed with an origin-bound signature.

Only public keys are published. The matching private key must be present in encrypted server configuration. AGENT_SIGNING_PUBLIC_JWKS can override the repository's public directory for a deployment-specific identity. There is no unauthenticated signing-proxy endpoint. Key generation and rotation instructions are in the source repository README.
`;
