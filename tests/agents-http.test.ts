import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { AP2_EXTENSION } from "../lib/agents/site";

const base = process.env.AGENT_TEST_URL ?? "http://127.0.0.1:3100";
const get = (path: string, init: RequestInit = {}) =>
  fetch(new URL(path, base), { ...init, signal: AbortSignal.timeout(40_000) });
const post = (
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  get(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
const local = (url: string) => new URL(url).pathname;

test("Homepage negotiates Markdown, preserves HTML, and provides discovery headers", async () => {
  const html = await get("/");
  assert.equal(html.status, 200);
  assert.match(html.headers.get("content-type")!, /text\/html/);
  assert.match(html.headers.get("cache-control")!, /no-store/);
  for (const rel of [
    "api-catalog",
    "service-desc",
    "service-doc",
    "describedby",
  ])
    assert.ok(html.headers.get("link")!.includes(`rel="${rel}"`));
  assert.match(await html.text(), /MornLark/);
  const markdown = await get("/", { headers: { Accept: "text/markdown" } });
  assert.equal(markdown.status, 200);
  assert.match(markdown.headers.get("content-type")!, /text\/markdown/);
  assert.match(markdown.headers.get("vary")!, /Accept/i);
  assert.equal(
    markdown.headers.get("content-signal"),
    "ai-train=no, search=yes, ai-input=yes",
  );
  const body = await markdown.text();
  assert.ok(body.startsWith("# MornLark\n\n"));
  assert.equal(body, await (await get("/index.md")).text());
  const head = await get("/", {
    method: "HEAD",
    headers: { Accept: "text/markdown" },
  });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  assert.match(head.headers.get("content-type")!, /text\/markdown/);
  assert.match(
    (
      await get("/", {
        headers: { Accept: "text/markdown;q=0.1,text/html;q=0.9" },
      })
    ).headers.get("content-type")!,
    /text\/html/,
  );
});

test("Crawler documents and all discovery resources return documented media types", async () => {
  const robots = await get("/robots.txt");
  assert.equal(robots.status, 200);
  assert.match(robots.headers.get("content-type")!, /text\/plain/);
  const rules = await robots.text();
  assert.match(rules, /User-agent: \*/i);
  assert.match(rules, /Allow:/i);
  assert.match(rules, /Content-Signal: ai-train=no, search=yes, ai-input=yes/);
  assert.match(rules, /Sitemap: https:\/\/mornlark.com\/sitemap.xml/);
  const sitemap = await get("/sitemap.xml");
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.headers.get("content-type")!, /xml/);
  assert.match(await sitemap.text(), /<loc>https:\/\/mornlark.com\/<\/loc>/);
  const routes = {
    "/.well-known/api-catalog": "application/linkset+json",
    "/.well-known/agent-card.json": "application/json",
    "/.well-known/mcp/server-card.json": "application/json",
    "/mcp/server-card": "application/json",
    "/.well-known/agent-skills/index.json": "application/json",
    "/.well-known/http-message-signatures-directory":
      "application/http-message-signatures-directory+json",
    "/.well-known/acp.json": "application/json",
    "/.well-known/ucp": "application/json",
    "/openapi.json": "application/vnd.oai.openapi+json",
    "/schemas/catalog.json": "application/schema+json",
  };
  for (const [path, type] of Object.entries(routes)) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    assert.ok(response.headers.get("content-type")!.startsWith(type), path);
    await response.json();
  }
  for (const path of ["/auth.md", "/docs/agents.md"]) {
    const response = await get(path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type")!, /text\/markdown/);
    assert.match(
      await response.text(),
      path === "/auth.md" ? /^# .*auth\.md/m : /sandbox/i,
    );
  }
  assert.equal((await get("/.well-known/unknown")).status, 404);
});

test("Catalog links, UCP spec/schema URLs, and skill artifacts resolve", async () => {
  const catalog = await (await get("/.well-known/api-catalog")).json();
  for (const entry of catalog.linkset) {
    assert.ok(entry.anchor.startsWith("https://mornlark.com/"));
    for (const rel of ["service-desc", "service-doc", "status"]) {
      const response = await get(local(entry[rel][0].href));
      assert.equal(response.status, 200, entry[rel][0].href);
      await response.arrayBuffer();
    }
  }
  const profile = await (await get("/.well-known/ucp")).json();
  assert.equal(profile.protocol_version, profile.ucp.version);
  for (const group of [profile.services, profile.capabilities]) {
    for (const entries of Object.values(group) as Array<
      Array<{ spec: string; schema: string }>
    >) {
      for (const entry of entries)
        for (const url of [entry.spec, entry.schema])
          assert.equal((await get(local(url))).status, 200, url);
    }
  }
  const index = await (
    await get("/.well-known/agent-skills/index.json")
  ).json();
  for (const skill of index.skills) {
    const response = await get(local(skill.url));
    assert.equal(response.status, 200);
    const artifact = Buffer.from(await response.arrayBuffer());
    assert.equal(
      skill.digest,
      `sha256:${createHash("sha256").update(artifact).digest("hex")}`,
    );
  }
  const directory = await (
    await get("/.well-known/http-message-signatures-directory")
  ).json();
  assert.ok(directory.keys.length > 0);
  for (const key of directory.keys) {
    assert.equal(key.crv, "Ed25519");
    assert.ok(!("d" in key));
  }
});

test("REST validation, anonymous handshake, and signed checkout previews fail safely", async () => {
  assert.equal((await get("/api/products?q=scout")).status, 200);
  assert.equal((await get("/api/products?maxPrice=invalid")).status, 400);
  assert.equal((await get("/api/products/missing")).status, 404);
  const quote = await post("/api/quote", {
    items: [{ id: "miko", quantity: 2 }],
  });
  assert.equal(quote.status, 200);
  assert.equal((await quote.json()).payment_required, false);
  assert.equal(
    (
      await post("/api/quote", {
        items: [{ id: "miko", quantity: 1, price: 1 }],
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await post(
        "/api/quote",
        { items: [{ id: "miko", quantity: 1 }] },
        { Origin: "https://other.example" },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await get("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: " ".repeat(33_000),
      })
    ).status,
    413,
  );
  assert.equal(
    (await post("/api/agent/register", { name: "test-agent" })).status,
    200,
  );
  const registration = await (await post("/api/agent/register", {})).json();
  assert.equal(registration.account_created, false);
  assert.equal(registration.credential.type, "none");
  const preview = await post("/api/commerce/checkout_sessions", {
    items: [{ id: "miko", quantity: 1 }],
  });
  assert.ok([201, 503].includes(preview.status));
  if (process.env.AGENT_EXPECT_SIGNING === "1")
    assert.equal(preview.status, 201);
  if (preview.status === 201) {
    const session = await preview.json();
    assert.equal(session.payment_execution, false);
    assert.equal(
      (await get(`/api/commerce/checkout_sessions/${session.id}`)).status,
      200,
    );
    assert.equal(
      (await post(`/api/commerce/checkout_sessions/${session.id}/complete`, {}))
        .status,
      409,
    );
    assert.equal(
      (
        await get(
          `/api/commerce/checkout_sessions/e30.${session.id.split(".")[1]}`,
        )
      ).status,
      404,
    );
  } else assert.match((await preview.json()).detail, /configured/);
  for (const path of ["/api/payments/x402", "/api/payments/mpp"])
    assert.equal((await get(path)).status, 503);
});

test("Official MCP client initializes and uses advertised tools, resource, and prompt", async () => {
  const client = new Client({
    name: "mornlark-integration-test",
    version: "1.0.0",
  });
  const transport = new StreamableHTTPClientTransport(new URL("/mcp", base));
  try {
    await client.connect(transport, { timeout: 30_000 });
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), [
      "get_robot",
      "preview_quote",
      "search_robots",
    ]);
    const result = await client.callTool({
      name: "search_robots",
      arguments: { query: "scout" },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    assert.equal(JSON.parse(content[0].text).products[0].id, "scout");
    assert.equal(
      (
        await client.callTool({
          name: "get_robot",
          arguments: { id: "missing" },
        })
      ).isError,
      true,
    );
    const resources = await client.listResources();
    assert.equal(resources.resources.length, 1);
    const resource = await client.readResource({
      uri: resources.resources[0].uri,
    });
    assert.ok("text" in resource.contents[0]);
    assert.equal(JSON.parse(resource.contents[0].text).total, 4);
    const prompts = await client.listPrompts();
    assert.equal(prompts.prompts[0].name, "choose-robot");
    assert.equal(
      (
        await client.getPrompt({
          name: "choose-robot",
          arguments: { needs: "cleaning" },
        })
      ).messages.length,
      1,
    );
  } finally {
    await client.close();
  }
});

test("A2A discovery matches a working structured SendMessage endpoint", async () => {
  const card = await (await get("/.well-known/agent-card.json")).json();
  assert.equal(card.supportedInterfaces[0].protocolVersion, "1.0");
  assert.equal(card.capabilities.extensions[0].required, true);
  assert.deepEqual(card.capabilities.extensions[0].params.roles, ["merchant"]);
  const response = await post(
    "/a2a",
    {
      jsonrpc: "2.0",
      id: 1,
      method: "SendMessage",
      params: {
        message: {
          messageId: "integration-test",
          role: "ROLE_USER",
          parts: [
            {
              data: {
                action: "preview_quote",
                items: [{ id: "scout", quantity: 1 }],
              },
            },
          ],
        },
      },
    },
    { "A2A-Version": "1.0", "A2A-Extensions": AP2_EXTENSION },
  );
  assert.equal(response.status, 200);
  assert.equal(
    (await response.json()).result.message.parts[1].data.total_amount,
    129900,
  );
});
