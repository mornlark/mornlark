import { createHash, generateKeyPairSync } from "node:crypto";

// Each test process creates an isolated identity. No deployed private key is needed.
export function configureTestIdentity() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const jwk = publicKey.export({ format: "jwk" });
  const kid = createHash("sha256")
    .update(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x }))
    .digest("base64url");
  const values = {
    AGENT_SIGNING_PRIVATE_KEY: privateKey
      .export({ format: "der", type: "pkcs8" })
      .toString("base64"),
    AGENT_SIGNING_PUBLIC_JWKS: JSON.stringify({ keys: [{ ...jwk, kid }] }),
    AGENT_SESSION_SECRET: "test-session-secret-".repeat(4),
  };
  const previous = Object.fromEntries(
    Object.keys(values).map((name) => [name, process.env[name]]),
  );
  Object.assign(process.env, values);
  return {
    publicKey,
    kid,
    restore: () => {
      for (const [name, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    },
  };
}
