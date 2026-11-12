import {
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  sign,
  timingSafeEqual,
  verify,
} from "node:crypto";
import keys from "@/config/agent-public-keys.json";
import { AgentError } from "./catalog";
import { SITE_ORIGIN } from "./site";

export function publicJwks(): { keys: typeof keys.keys } {
  const configured = process.env.AGENT_SIGNING_PUBLIC_JWKS;
  if (!configured) return { keys: keys.keys };
  try {
    const value = JSON.parse(configured);
    if (
      !Array.isArray(value.keys) ||
      !value.keys.length ||
      value.keys.length > 8
    )
      throw new Error();
    return {
      keys: value.keys.map((jwk: Record<string, unknown>) => {
        if (
          jwk.kty !== "OKP" ||
          jwk.crv !== "Ed25519" ||
          typeof jwk.x !== "string" ||
          !/^[A-Za-z0-9_-]{43}$/.test(jwk.x) ||
          "d" in jwk
        )
          throw new Error();
        const thumbprint = createHash("sha256")
          .update(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x }))
          .digest("base64url");
        if (jwk.kid !== thumbprint) throw new Error();
        return {
          kty: "OKP",
          crv: "Ed25519",
          x: jwk.x,
          kid: thumbprint,
          alg: "EdDSA",
          use: "sig",
          key_ops: ["verify"],
        };
      }),
    };
  } catch {
    throw new AgentError(
      503,
      "The public verification key configuration is invalid.",
    );
  }
}

export function signingKey() {
  const encoded = process.env.AGENT_SIGNING_PRIVATE_KEY;
  if (!encoded)
    throw new AgentError(
      503,
      "Agent signing is not configured. Set the private key in encrypted server configuration.",
    );
  const key = createPrivateKey({
    key: Buffer.from(encoded, "base64"),
    format: "der",
    type: "pkcs8",
  });
  const publicKey = createPublicKey(key).export({ format: "jwk" });
  const advertised = publicJwks().keys.find(
    (key) => key.x === publicKey.x && key.crv === publicKey.crv,
  );
  if (!advertised)
    throw new AgentError(
      503,
      "The signing key does not match the published public key directory.",
    );
  return { key, kid: advertised.kid };
}

export function signSandboxDocument(payload: Record<string, unknown>) {
  const { key, kid } = signingKey();
  const header = Buffer.from(
    JSON.stringify({ alg: "EdDSA", typ: "JWT", kid }),
  ).toString("base64url");
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingInput = `${header}.${data}`;
  return `${signingInput}.${sign(null, Buffer.from(signingInput), key).toString("base64url")}`;
}

export function verifySandboxDocument(token: string) {
  if (token.length > 8192)
    throw new AgentError(400, "Signed document is too large.");
  const parts = token.split(".");
  if (parts.length !== 3) throw new AgentError(400, "Invalid signed document.");
  try {
    const header = JSON.parse(
      Buffer.from(parts[0], "base64url").toString("utf8"),
    );
    const publicJwk = publicJwks().keys.find((key) => key.kid === header.kid);
    if (
      header.alg !== "EdDSA" ||
      !publicJwk ||
      !verify(
        null,
        Buffer.from(`${parts[0]}.${parts[1]}`),
        createPublicKey({ key: publicJwk, format: "jwk" }),
        Buffer.from(parts[2], "base64url"),
      )
    )
      throw new Error();
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    if (typeof payload.exp !== "number" || payload.exp <= Date.now() / 1000)
      throw new Error();
    return payload;
  } catch {
    throw new AgentError(400, "Invalid or expired signed document.");
  }
}

export async function signAgentRequest(
  input: Request,
  now = Math.floor(Date.now() / 1000),
) {
  const { key, kid } = signingKey();
  const request = new Request(input);
  const url = new URL(request.url);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(url.hostname)
    )
  )
    throw new AgentError(
      400,
      "Signed requests require HTTPS or a local test endpoint.",
    );
  request.headers.set("Signature-Agent", JSON.stringify(SITE_ORIGIN));
  const components = [
    "@method",
    "@target-uri",
    "@authority",
    "signature-agent",
  ];
  const lines = [
    `"@method": ${request.method.toUpperCase()}`,
    `"@target-uri": ${request.url}`,
    `"@authority": ${url.host}`,
    `"signature-agent": ${request.headers.get("Signature-Agent")}`,
  ];
  if (request.body) {
    const body = Buffer.from(await request.clone().arrayBuffer());
    const digest = `sha-256=:${createHash("sha256").update(body).digest("base64")}:`;
    request.headers.set("Content-Digest", digest);
    components.push("content-digest");
    lines.push(`"content-digest": ${digest}`);
  }
  const parameters = `(${components.map((value) => JSON.stringify(value)).join(" ")});created=${now};expires=${now + 60};keyid=${JSON.stringify(kid)};alg="ed25519";nonce="${randomBytes(24).toString("base64url")}";tag="web-bot-auth"`;
  lines.push(`"@signature-params": ${parameters}`);
  request.headers.set("Signature-Input", `agent=${parameters}`);
  request.headers.set(
    "Signature",
    `agent=:${sign(null, Buffer.from(lines.join("\n")), key).toString("base64")}:`,
  );
  return request;
}

export async function agentFetch(input: RequestInfo | URL, init?: RequestInit) {
  // Do not forward an origin-bound signature across redirects.
  const request = await signAgentRequest(new Request(input, init));
  return fetch(request, { redirect: "error" });
}

export function sealSession(value: unknown) {
  const secret = process.env.AGENT_SESSION_SECRET;
  if (!secret || secret.length < 64)
    throw new AgentError(503, "Sandbox checkout signing is not configured.");
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}

export function unsealSession(token: string): unknown {
  if (token.length > 4096)
    throw new AgentError(400, "Session identifier is too large.");
  const secret = process.env.AGENT_SESSION_SECRET;
  if (!secret || secret.length < 64)
    throw new AgentError(503, "Sandbox checkout signing is not configured.");
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra)
    throw new AgentError(404, "Session not found.");
  const expected = createHmac("sha256", secret).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    throw new AgentError(404, "Session not found.");
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new AgentError(404, "Session not found.");
  }
}
