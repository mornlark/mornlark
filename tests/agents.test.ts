import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createHash, verify } from "node:crypto";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { products } from "../app/catalog";
import { createQuote, getProduct, searchProducts } from "../lib/agents/catalog";
import { homepageMarkdown, prefersMarkdown } from "../lib/agents/content";
import { checkOrigin, readJson } from "../lib/agents/http";
import {
  publicJwks,
  signAgentRequest,
  signSandboxDocument,
  verifySandboxDocument,
  sealSession,
  unsealSession,
} from "../lib/agents/signing";
import {
  createCheckoutPreview,
  getCheckoutPreview,
} from "../lib/agents/commerce";
import { skills, skillsIndex } from "../lib/agents/skills";
import { openApiDocument } from "../lib/agents/openapi";
import { handleA2a } from "../lib/agents/a2a";
import { AP2_EXTENSION } from "../lib/agents/site";
import { registerStorefrontTools } from "../lib/agents/webmcp";
import { configureTestIdentity } from "./identity";

const identity = configureTestIdentity();
after(identity.restore);

test("Markdown negotiation honors explicit media types, q values, and HTML defaults", () => {
  for (const value of [
    null,
    "*/*",
    "text/*",
    "text/html",
    "text/markdown;q=0",
    "text/markdown;q=0.2,text/html;q=0.9",
    "text/markdown;q=invalid",
    "text/markdown;q=2",
  ])
    assert.equal(prefersMarkdown(value), false, String(value));
  for (const value of [
    "text/markdown",
    "text/markdown,text/html",
    "text/markdown;q=0.9,text/html;q=0.1",
    "text/markdown;q=0.5,text/html;q=0,*/*",
    "TEXT/MARKDOWN; charset=utf-8",
  ])
    assert.equal(prefersMarkdown(value), true, value);
  const text = homepageMarkdown();
  assert.ok(text.startsWith("# MornLark\n\n"));
  assert.ok(!text.includes("<div"));
  for (const product of products) assert.ok(text.includes(product.name));
  assert.match(text, /illustrative catalog/);
});

test("Catalog filters share storefront prices without fabricated reviews", () => {
  const catalog = searchProducts({ maxPrice: 1000, sort: "price-low" });
  assert.ok(catalog.total > 0);
  assert.ok(
    catalog.products.every((product) => product.price.amount <= 100_000),
  );
  assert.deepEqual(
    catalog.products.map((p) => p.price.amount),
    catalog.products.map((p) => p.price.amount).sort((a, b) => a - b),
  );
  assert.equal(searchProducts({ query: "SCOUT" }).products[0].id, "scout");
  assert.ok(!("reviews" in getProduct("scout")));
  assert.throws(() => getProduct("missing"), /not found/);
  assert.throws(() => searchProducts({ maxPrice: NaN }));
  assert.throws(() => searchProducts({ category: "invented" }));
});

test("Quotes calculate server prices, consolidate duplicates, and reject client prices", () => {
  const quote = createQuote({
    items: [
      { id: "scout", quantity: 2 },
      { id: "scout", quantity: 1 },
      { id: "atlas", quantity: 1 },
    ],
  });
  assert.equal(quote.items[0].quantity, 3);
  assert.equal(quote.total_amount, (1299 * 3 + 2499) * 100);
  assert.equal(quote.payment_required, false);
  for (const input of [
    { items: [] },
    { items: [{ id: "scout", quantity: 1, price: 1 }] },
    { items: [{ id: "scout", quantity: 0 }] },
    { items: [{ id: "scout", quantity: 0.5 }] },
    {
      items: [
        { id: "scout", quantity: 99 },
        { id: "scout", quantity: 1 },
      ],
    },
  ])
    assert.throws(() => createQuote(input));
});

test("JSON readers bound actual streamed bytes and enforce MIME, UTF-8, and origins", async () => {
  const request = (body: BodyInit, type = "application/json") =>
    new Request("https://mornlark.com/api/quote", {
      method: "POST",
      headers: { "Content-Type": type },
      body,
    });
  assert.deepEqual(await readJson(request('{"ok":true}')), { ok: true });
  await assert.rejects(
    readJson(request("{}", "application/json-malicious")),
    /Content-Type/,
  );
  await assert.rejects(readJson(request(" ".repeat(33_000))), /too large/);
  await assert.rejects(readJson(request(new Uint8Array([0xff]))), /UTF-8/);
  await assert.rejects(readJson(request("{")), /valid UTF-8 JSON/);
  assert.throws(
    () =>
      checkOrigin(
        new Request("https://mornlark.com/api/quote", {
          headers: { Origin: "https://other.example" },
        }),
      ),
    /Cross-origin/,
  );
  assert.doesNotThrow(() =>
    checkOrigin(
      new Request("http://localhost:3100/api/quote", {
        headers: { Origin: "http://localhost:3100" },
      }),
    ),
  );
});

test("Published skill digests cover exact UTF-8 artifacts", () => {
  const index = skillsIndex();
  assert.equal(
    index.$schema,
    "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
  );
  for (const entry of index.skills) {
    assert.match(entry.name, /^[a-z0-9-]+$/);
    assert.equal(
      entry.digest,
      `sha256:${createHash("sha256")
        .update(skills.find((skill) => skill.name === entry.name)!.content)
        .digest("hex")}`,
    );
  }
});

test("OpenAPI schemas validate actual catalog and quote responses", () => {
  const doc = openApiDocument();
  const ajv = new Ajv2020({ strict: false });
  addFormats(ajv);
  ajv.addSchema({ $id: "https://test.example/openapi", ...doc });
  for (const [name, output] of [
    ["Catalog", searchProducts()],
    ["Product", getProduct("scout")],
    ["Quote", createQuote({ items: [{ id: "scout", quantity: 1 }] })],
  ] as const) {
    const valid = ajv.compile({
      $ref: `https://test.example/openapi#/components/schemas/${name}`,
    });
    assert.ok(valid(output), JSON.stringify(valid.errors));
  }
  const payment = doc.paths["/api/payments/mpp"].get["x-payment-info"];
  assert.equal(payment.intent, "charge");
  assert.equal(payment.method, "tempo");
  assert.equal(payment.amount, "1000");
});

test("Web Bot Auth signatures independently verify and bind body, destination, and lifetime", async () => {
  const request = await signAgentRequest(
    new Request("https://receiver.example/path?q=1", {
      method: "POST",
      body: "hello",
    }),
    1_800_000_000,
  );
  assert.equal(
    request.headers.get("signature-agent"),
    '"https://mornlark.com"',
  );
  const parameters = request.headers
    .get("signature-input")!
    .slice("agent=".length);
  assert.match(parameters, /created=1800000000;expires=1800000060/);
  assert.match(parameters, /tag="web-bot-auth"/);
  const digest = `sha-256=:${createHash("sha256").update("hello").digest("base64")}:`;
  assert.equal(request.headers.get("content-digest"), digest);
  const base = [
    '"@method": POST',
    '"@target-uri": https://receiver.example/path?q=1',
    '"@authority": receiver.example',
    '"signature-agent": "https://mornlark.com"',
    `"content-digest": ${digest}`,
    `"@signature-params": ${parameters}`,
  ].join("\n");
  const signature = Buffer.from(
    request.headers.get("signature")!.match(/^agent=:(.+):$/)![1],
    "base64",
  );
  assert.equal(
    verify(null, Buffer.from(base), identity.publicKey, signature),
    true,
  );
  assert.equal(
    verify(
      null,
      Buffer.from(base.replace("receiver.example/path", "other.example/path")),
      identity.publicKey,
      signature,
    ),
    false,
  );
  assert.equal(await request.text(), "hello");
  assert.ok(publicJwks().keys.every((key) => !("d" in key)));
  await assert.rejects(
    signAgentRequest(new Request("http://receiver.example")),
    /HTTPS/,
  );
});

test("Signed previews reject tampering and expiration; checkout never enables payment", () => {
  const preview = createCheckoutPreview({
    items: [{ id: "miko", quantity: 2 }],
  });
  assert.equal(preview.payment_execution, false);
  assert.equal(
    getCheckoutPreview(preview.id).quote.total_amount,
    preview.quote.total_amount,
  );
  assert.deepEqual(
    verifySandboxDocument(preview.signed_preview).quote,
    preview.quote,
  );
  const parts = preview.signed_preview.split(".");
  parts[1] = Buffer.from(
    JSON.stringify({ exp: 9_999_999_999, quote: { total_amount: 0 } }),
  ).toString("base64url");
  assert.throws(() => verifySandboxDocument(parts.join(".")), /Invalid/);
  assert.throws(
    () => verifySandboxDocument(signSandboxDocument({ exp: 1 })),
    /expired/,
  );
  const sealed = sealSession({ hello: "world" });
  assert.deepEqual(unsealSession(sealed), { hello: "world" });
  assert.throws(
    () => unsealSession(`e30.${sealed.split(".")[1]}`),
    /not found/,
  );
  assert.throws(
    () =>
      getCheckoutPreview(
        sealSession({
          version: 1,
          mode: "sandbox",
          nonce: crypto.randomUUID(),
          expires: 1,
          items: [{ id: "scout", quantity: 1 }],
        }),
      ),
    /expired/,
  );
});

test("A2A handles structured v1 messages, requires extension acknowledgment, and rejects payments", async () => {
  const call = (data: unknown, acknowledge = true, method = "SendMessage") =>
    handleA2a(
      new Request("https://mornlark.com/a2a", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "A2A-Version": "1.0",
          ...(acknowledge ? { "A2A-Extensions": AP2_EXTENSION } : {}),
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "test",
          method,
          params: {
            message: {
              messageId: "test",
              role: "ROLE_USER",
              parts: [{ data }],
            },
          },
        }),
      }),
    );
  const response = await call({
    action: "search_robots",
    filters: { query: "scout" },
  });
  const payload = await response.json();
  assert.equal(payload.result.message.role, "ROLE_AGENT");
  assert.equal(payload.result.message.parts[1].data.products[0].id, "scout");
  assert.equal(
    (await (await call({ action: "search_robots" }, false)).json()).error.code,
    -32003,
  );
  assert.equal(
    (await (await call({}, true, "DeleteEverything")).json()).error.code,
    -32601,
  );
  assert.equal((await call({ action: "pay", amount: 0 })).status, 400);
});

test("WebMCP exposes five bounded tools and aborts their registrations on cleanup", async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  const originalDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    "document",
  );
  const registered: Array<{ tool: unknown; signal: AbortSignal }> = [];
  const tools: Record<string, { execute(input: unknown): Promise<unknown> }> =
    {};
  const removed: string[] = [];
  let shown = "";
  let searched: unknown;
  const context = {
    registerTool(
      tool: { name: string; execute(input: unknown): Promise<unknown> },
      options: { signal: AbortSignal },
    ) {
      tools[tool.name] = tool;
      registered.push({ tool, signal: options.signal });
    },
    unregisterTool(name: string) {
      removed.push(name);
    },
  };
  try {
    for (const owner of ["navigator", "document"]) {
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: owner === "navigator" ? { modelContext: context } : {},
      });
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: owner === "document" ? { modelContext: context } : {},
      });
      const cleanup = registerStorefrontTools({
        search: (input) => {
          searched = input;
        },
        view: (id) => {
          shown = id;
        },
      });
      assert.equal(Object.keys(tools).length, 5);
      await tools.search_robots.execute({ query: "scout" });
      assert.deepEqual(searched, { query: "scout" });
      await tools.view_robot.execute({ id: "miko" });
      assert.equal(shown, "miko");
      await assert.rejects(
        tools.preview_quote.execute({ items: [{ id: "miko", quantity: -1 }] }),
      );
      await assert.rejects(
        tools.navigate_store.execute({ section: "https://other.example" }),
      );
      cleanup!();
    }
    assert.ok(registered.every((entry) => entry.signal.aborted));
    assert.equal(removed.length, 10);
  } finally {
    if (originalNavigator)
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    else Reflect.deleteProperty(globalThis, "navigator");
    if (originalDocument)
      Object.defineProperty(globalThis, "document", originalDocument);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
