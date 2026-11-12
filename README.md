# MornLark

A robot shopping storefront built with Next.js 16, React 19, and TypeScript. The design uses an editorial catalog layout, Geist typography, restrained green accents, and local robot imagery.

## Run locally

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For a production check:

```sh
npm run build
npm run start
```

Use the existing Cloudflare deployment workflow. No Sites hosting or deployment configuration is added.

## Storefront

- Four sample robots with product details and specifications.
- Category filtering, text search, maximum-price filtering, and price sorting.
- Saved favorites and a shopping bag persisted in browser local storage.
- Quantity controls, item removal, calculated totals, and a robot match finder.
- Responsive layouts, keyboard-accessible dialogs, focus indicators, and reduced-motion support.
- A clearly labeled demo checkout that validates the form and completes a local preview order.

The catalog is illustrative. Checkout does not process payments or create fulfillment orders. Form details are neither sent to a server nor stored. Cart and favorites use this browser only.

## Editing

- `app/catalog.ts`: sample products, prices, descriptions, and features.
- `app/storefront.tsx`: browsing and shopping interactions.
- `app/globals.css`: responsive layout and styling.
- `app/tokens.css`: shared color, typography, spacing, and control tokens.
- `app/base.css`: foundational styles and accessibility defaults.
- `app/layout.tsx`: page metadata and fonts.
- `app/sitemap.ts`: canonical public page URLs, generated as `/sitemap.xml` at build time.
- `app/robots.txt`: crawler rules and the sitemap reference.
- `public/images/robot-hero.webp`: featured robot photograph.
- `public/images/robot-collection.webp`: four product photographs arranged in equal quadrants and displayed as a CSS image sprite.

The images are compressed WebP files, served locally without an external image service. Image generation prompts and provenance are in [docs/image-prompts.md](docs/image-prompts.md).

## Design approach

The redesign follows [Hallmark](https://github.com/Nutlope/hallmark) v2 while retaining MornLark's name, green accent, imagery, and shopping interactions. Product names, prices, and specifications lead the catalog. Sample customer ratings and unverified popularity badges are omitted, and illustrative products and policies are identified as previews.

Design decisions and copy changes are recorded in `.hallmark/`. Local before-and-after captures are available in `.hallmark/compare.html` after running Hallmark's browser checks; generated screenshots and inventories are ignored by Git.

Cart and favorites are restored from browser storage after hydration. That existing behavior has a narrowly documented lint exception so the server and initial browser render stay consistent.

## Sitemap maintenance

The storefront currently has one public page, `https://mornlark.com/`. When publishing or removing a public page, update `app/sitemap.ts` in the same change and rebuild and deploy the site. Use each page's canonical HTTPS URL. Catalog edits keep the same home page URL, so they do not require new sitemap entries.

After deployment, verify `/sitemap.xml` returns HTTP 200 with XML and `/robots.txt` includes `Sitemap: https://mornlark.com/sitemap.xml`. Run the discoverability scan:

```sh
curl https://isitagentready.com/api/scan \
  -H 'Content-Type: application/json' \
  --data '{"url":"https://mornlark.com"}'
```

Confirm `checks.discoverability.sitemap.status` is `"pass"`.

## Agent access

Request the homepage with `Accept: text/markdown` for clean catalog text. Browser requests receive HTML. The homepage links to the API catalog, OpenAPI document, agent documentation, and `auth.md`. Robots content preferences allow search and agent input and decline AI training.

The public catalog and quote API share the storefront's product data. MCP Streamable HTTP at `/mcp` exposes three tools, a catalog resource, and a comparison prompt. A2A at `/a2a` supports structured catalog and quote messages. Native WebMCP browsers receive five tools on page load, with abort cleanup when the storefront unmounts.

Discovery documents are served under `/.well-known/` for API catalog, A2A, skills with SHA-256 digests, MCP, Web Bot Auth, ACP, and UCP. The current MCP Server Card is also at `/mcp/server-card`. Read `/docs/agents.md` and `/openapi.json` for exact schemas, headers, and protocol versions. Public access is anonymous; no OAuth issuer or customer account is fabricated.

Commerce is a sandbox. ACP advertises catalog and checkout previews, and UCP advertises a custom catalog capability. The A2A card declares an AP2 merchant extension with payment execution disabled. These are discovery and preview integrations, not a complete production ACP/AP2 payment implementation. Checkout completion always returns HTTP 409. MPP and x402 protect separate test resources when explicitly enabled; neither places an order or supports mainnet payments.

### Signing and test configuration

Use Node.js 22 or newer. On a fresh checkout, generate a local identity:

```sh
npm run agents:keys
```

This writes an ignored, mode-0600 `.env.local` containing an Ed25519 private key, public JWKS, sandbox session and MPP secrets, and an unfunded test wallet. It refuses to overwrite existing configuration and leaves test payments disabled. It does not change the tracked public key directory. Do not commit `.env.local` or private wallet keys.

For hosting, configure `AGENT_SIGNING_PRIVATE_KEY`, its matching `AGENT_SIGNING_PUBLIC_JWKS`, and `AGENT_SESSION_SECRET` as encrypted environment settings. The private key uses base64 PKCS#8 DER; public key IDs use RFC 7638 SHA-256 thumbprints. Without a public override, the directory serves `config/agent-public-keys.json`; an unrelated private key is rejected. Rotate by retaining old public keys during the 60-second request-signature lifetime and 15-minute preview lifetime, then remove them. Keep the session secret stable for active previews.

Signed outbound GET requests can be sent with `npm run agents:fetch -- https://example.com/resource`. Server code can use `agentFetch` from `lib/agents/signing.ts`, including requests with bodies. Requests bind method, destination, agent identity, expiry, nonce, and body digest. Redirects are rejected.

`.env.example` lists all deployment settings. `AGENT_ENABLE_TEST_PAYMENTS=1` requires an explicit test recipient and enables only Tempo Moderato MPP and Base Sepolia x402. MPP also needs `MPP_SECRET_KEY`; x402 uses the configured HTTPS facilitator. Keep both routes disabled on multi-instance hosting until MPP has a shared replay store. Test wallet secrets stay local; the application only needs public recipient addresses. Real commerce still needs a merchant processor, mandate validation, durable orders, and fulfillment.

### Agent checks

```sh
npm run test:agents
npm run lint
npx tsc --noEmit
npm run build -- --webpack
```

With a local server running on port 3100 (`npm run dev -- --webpack --port 3100`), run `npm run test:agents:http`. Set `AGENT_EXPECT_SIGNING=1` to require the configured checkout-preview success path. `AGENT_TEST_URL` selects a different test server. The suite checks real HTTP responses, exact skill hashes, referenced resources, REST validation, MCP client round trips, A2A messages, and disabled payment routes. It does not perform payment transactions.

After merging and deploying through the existing Cloudflare workflow, run the readiness scan above. Local tests cannot establish the live domain's scan results. Browser WebMCP detection depends on native browser support; unsupported browsers retain the standard storefront. If Cloudflare manages robots or rewrites response headers, preserve these origin declarations and the distinction between HTML and Markdown.
