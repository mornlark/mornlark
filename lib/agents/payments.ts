import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import {
  HTTPFacilitatorClient,
  x402ResourceServer,
  type FacilitatorClient,
} from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { Mppx, Store, tempo } from "mppx/server";
import { createClient, http, isAddress } from "viem";
import { tempoModerato } from "viem/chains";
import { AgentError } from "./catalog";
import { checkOrigin, json, problem, publicHeaders } from "./http";
import { SITE_ORIGIN } from "./site";

export const TEST_PAYMENT_AMOUNT = "0.001";
export const X402_TEST_NETWORK = "eip155:84532" as const;
export const TEMPO_TEST_CURRENCY =
  "0x20c0000000000000000000006a37DA5C996874BE" as const;

function requireTestPayments() {
  if (process.env.AGENT_ENABLE_TEST_PAYMENTS !== "1") {
    throw new AgentError(
      503,
      "Test payments are disabled. This sandbox cannot charge real money.",
    );
  }
}

function recipient(name: "X402_PAY_TO" | "MPP_RECIPIENT") {
  const address = process.env[name];
  if (!address || !isAddress(address) || /^0x0{40}$/i.test(address))
    throw new AgentError(
      503,
      "A valid test-payment recipient must be configured.",
    );
  return address as `0x${string}`;
}

export function createX402TestHandler(
  payTo: `0x${string}`,
  facilitator: FacilitatorClient = new HTTPFacilitatorClient({
    url: "https://x402.org/facilitator",
    timeoutMs: 10_000,
  }),
) {
  const server = new x402ResourceServer(facilitator).register(
    X402_TEST_NETWORK,
    new ExactEvmScheme(),
  );
  return withX402(
    async () =>
      NextResponse.json(
        {
          mode: "sandbox",
          resource: "MornLark test-payment resource",
          real_order: false,
          fulfillment_available: false,
        },
        { headers: { ...publicHeaders, "Cache-Control": "private, no-store" } },
      ),
    {
      accepts: [
        {
          scheme: "exact",
          network: X402_TEST_NETWORK,
          price: `$${TEST_PAYMENT_AMOUNT}`,
          payTo,
        },
      ],
      description:
        "MornLark test resource. Base Sepolia test USDC only; no real order or shipment.",
      mimeType: "application/json",
    },
    server,
  );
}

let x402Handler: ReturnType<typeof createX402TestHandler> | undefined;
let x402Config = "";

export async function handleX402(request: NextRequest) {
  try {
    checkOrigin(request);
    requireTestPayments();
    const payTo = recipient("X402_PAY_TO");
    const facilitatorUrl = new URL(
      process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator",
    );
    const localTest =
      process.env.NODE_ENV !== "production" &&
      ["localhost", "127.0.0.1"].includes(facilitatorUrl.hostname);
    if (
      facilitatorUrl.username ||
      facilitatorUrl.password ||
      (facilitatorUrl.protocol !== "https:" && !localTest)
    )
      throw new AgentError(503, "The facilitator must be an HTTPS endpoint.");
    const config = `${payTo}:${facilitatorUrl.href}`;
    if (!x402Handler || config !== x402Config) {
      x402Handler = createX402TestHandler(
        payTo,
        new HTTPFacilitatorClient({
          url: facilitatorUrl.href,
          timeoutMs: 10_000,
        }),
      );
      x402Config = config;
    }
    const response = await x402Handler(request);
    Object.entries(publicHeaders).forEach(([key, value]) =>
      response.headers.set(key, value),
    );
    return response;
  } catch (error) {
    return problem(
      error instanceof AgentError
        ? error
        : new AgentError(
            503,
            "The test payment facilitator is unavailable. No resource was granted.",
          ),
    );
  }
}

const testReplayStore = Store.memory();

export function createMppTestServer(payTo: `0x${string}`, secretKey: string) {
  const client = createClient({
    chain: tempoModerato,
    transport: http("https://rpc.moderato.tempo.xyz", {
      timeout: 10_000,
      retryCount: 0,
    }),
  });
  return Mppx.create({
    methods: [
      tempo.charge({
        currency: TEMPO_TEST_CURRENCY,
        decimals: 6,
        recipient: payTo,
        chainId: tempoModerato.id,
        testnet: true,
        supportedModes: ["push"],
        html: false,
        store: testReplayStore,
        confirmationTimeoutMs: 10_000,
        getClient: ({ chainId }) => {
          if (chainId !== undefined && chainId !== tempoModerato.id)
            throw new AgentError(
              400,
              "Only the Tempo test network is supported.",
            );
          return client;
        },
      }),
    ],
    secretKey,
    realm: SITE_ORIGIN,
  });
}

let mppServer: ReturnType<typeof createMppTestServer> | undefined;
let mppConfig = "";

export async function handleMpp(request: Request) {
  try {
    checkOrigin(request);
    requireTestPayments();
    const payTo = recipient("MPP_RECIPIENT");
    const secret = process.env.MPP_SECRET_KEY;
    if (!secret || secret.length < 64)
      throw new AgentError(
        503,
        "MPP challenge signing has not been configured.",
      );
    if (!mppServer || mppConfig !== `${payTo}:${secret}`) {
      mppServer = createMppTestServer(payTo, secret);
      mppConfig = `${payTo}:${secret}`;
    }
    const payment = await mppServer.charge({
      amount: TEST_PAYMENT_AMOUNT,
      description: "MornLark test resource. Tempo testnet only; no real order.",
      scope: request.url,
      expires: new Date(Date.now() + 60_000),
    })(request);
    if (payment.status !== 200) {
      const response = payment.challenge;
      Object.entries(publicHeaders).forEach(([key, value]) =>
        response.headers.set(key, value),
      );
      return response;
    }
    return payment.withReceipt(
      json({
        mode: "sandbox",
        resource: "MornLark test-payment resource",
        real_order: false,
        fulfillment_available: false,
      }),
    );
  } catch (error) {
    return problem(
      error instanceof AgentError
        ? error
        : new AgentError(
            503,
            "The test payment service is unavailable. No resource was granted.",
          ),
    );
  }
}
