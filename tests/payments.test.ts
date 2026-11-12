import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import type { FacilitatorClient } from "@x402/core/server";
import {
  createMppTestServer,
  createX402TestHandler,
  handleMpp,
  handleX402,
} from "../lib/agents/payments";

const recipient = "0x1234567890123456789012345678901234567890";

test("Payment routes fail closed by default", async () => {
  const previous = process.env.AGENT_ENABLE_TEST_PAYMENTS;
  delete process.env.AGENT_ENABLE_TEST_PAYMENTS;
  try {
    for (const response of [
      await handleMpp(new Request("https://mornlark.com/api/payments/mpp")),
      await handleX402(
        new NextRequest("https://mornlark.com/api/payments/x402"),
      ),
    ]) {
      assert.equal(response.status, 503);
      assert.match((await response.json()).detail, /disabled/);
    }
  } finally {
    if (previous === undefined) delete process.env.AGENT_ENABLE_TEST_PAYMENTS;
    else process.env.AGENT_ENABLE_TEST_PAYMENTS = previous;
  }
});

test("Official x402 middleware requires test-network payment before granting a resource", async () => {
  let verified = 0;
  const facilitator: FacilitatorClient = {
    getSupported: async () => ({
      kinds: [{ x402Version: 2, scheme: "exact", network: "eip155:84532" }],
      extensions: [],
      signers: {},
    }),
    verify: async () => {
      verified++;
      return { isValid: false, invalidReason: "invalid_signature" };
    },
    settle: async () => {
      throw new Error("An invalid test payment must never settle.");
    },
  };
  const handler = createX402TestHandler(recipient, facilitator);
  const response = await handler(
    new NextRequest("https://mornlark.com/api/payments/x402"),
  );
  assert.equal(response.status, 402);
  const required = JSON.parse(
    Buffer.from(response.headers.get("payment-required")!, "base64").toString(),
  );
  assert.equal(required.x402Version, 2);
  assert.equal(required.accepts[0].network, "eip155:84532");
  assert.equal(required.accepts[0].amount, "1000");
  assert.equal(required.accepts[0].payTo, recipient);
  assert.equal(verified, 0);
  const invalid = await handler(
    new NextRequest("https://mornlark.com/api/payments/x402", {
      headers: {
        "payment-signature": Buffer.from(
          JSON.stringify({
            x402Version: 2,
            accepted: required.accepts[0],
            payload: { signature: "0x00" },
          }),
        ).toString("base64"),
      },
    }),
  );
  assert.equal(invalid.status, 402);
  assert.equal(verified, 1);
  assert.ok(
    !JSON.stringify(await invalid.json()).includes('"real_order":false'),
  );
});

test("x402 does not release the resource when settlement fails", async () => {
  let settled = 0;
  const facilitator: FacilitatorClient = {
    getSupported: async () => ({
      kinds: [{ x402Version: 2, scheme: "exact", network: "eip155:84532" }],
      extensions: [],
      signers: {},
    }),
    verify: async () => ({ isValid: true, payer: recipient }),
    settle: async () => {
      settled++;
      return {
        success: false,
        errorReason: "test_settlement_failed",
        transaction: "",
        network: "eip155:84532",
      };
    },
  };
  const handler = createX402TestHandler(recipient, facilitator);
  const challenge = await handler(
    new NextRequest("https://mornlark.com/api/payments/x402"),
  );
  const required = JSON.parse(
    Buffer.from(
      challenge.headers.get("payment-required")!,
      "base64",
    ).toString(),
  );
  const response = await handler(
    new NextRequest("https://mornlark.com/api/payments/x402", {
      headers: {
        "payment-signature": Buffer.from(
          JSON.stringify({
            x402Version: 2,
            accepted: required.accepts[0],
            payload: { signature: "test-only-stub" },
          }),
        ).toString("base64"),
      },
    }),
  );
  assert.equal(settled, 1);
  assert.notEqual(response.status, 200);
  assert.ok(
    !JSON.stringify(await response.json()).includes('"real_order":false'),
  );
});

test("MPP issues a bounded Tempo testnet challenge without sending a transaction", async () => {
  const server = createMppTestServer(recipient, "test-mpp-secret-".repeat(5));
  const result = await server.charge({
    amount: "0.001",
    expires: new Date(Date.now() + 60_000),
    scope: "https://mornlark.com/api/payments/mpp",
  })(new Request("https://mornlark.com/api/payments/mpp"));
  assert.equal(result.status, 402);
  const header = result.challenge.headers.get("www-authenticate")!;
  assert.match(header, /^Payment /);
  assert.match(header, /method="tempo"/);
  assert.match(header, /intent="charge"/);
  const encoded = header.match(/request="([^"]+)"/)![1];
  const request = JSON.parse(Buffer.from(encoded, "base64url").toString());
  assert.equal(request.amount, "1000");
  assert.equal(request.recipient, recipient);
  assert.equal(request.methodDetails.chainId, 42431);
});
