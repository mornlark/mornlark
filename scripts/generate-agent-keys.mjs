import { createHash, generateKeyPairSync, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const envPath = new URL("../.env.local", import.meta.url);
const current = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
if (/^AGENT_SIGNING_PRIVATE_KEY=/m.test(current)) {
  throw new Error(
    "Agent keys already exist. Rotate them explicitly; this command will not replace an existing identity.",
  );
}
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const publicJwk = publicKey.export({ format: "jwk" });
const thumbprint = createHash("sha256")
  .update(
    JSON.stringify({ crv: publicJwk.crv, kty: publicJwk.kty, x: publicJwk.x }),
  )
  .digest("base64url");
const walletKey = generatePrivateKey();
const wallet = privateKeyToAccount(walletKey);
const additions = {
  AGENT_SIGNING_PRIVATE_KEY: privateKey
    .export({ format: "der", type: "pkcs8" })
    .toString("base64"),
  AGENT_SIGNING_PUBLIC_JWKS: JSON.stringify({
    keys: [
      {
        ...publicJwk,
        kid: thumbprint,
        alg: "EdDSA",
        use: "sig",
        key_ops: ["verify"],
      },
    ],
  }),
  AGENT_SESSION_SECRET: randomBytes(32).toString("hex"),
  MPP_SECRET_KEY: randomBytes(32).toString("hex"),
  AGENT_ENABLE_TEST_PAYMENTS: "0",
  X402_PAY_TO: wallet.address,
  MPP_RECIPIENT: wallet.address,
  AGENT_TEST_WALLET_PRIVATE_KEY: walletKey,
};
for (const name of Object.keys(additions)) {
  if (new RegExp(`^${name}=`, "m").test(current))
    throw new Error(
      `Existing ${name} configuration must be handled explicitly.`,
    );
}
writeFileSync(
  envPath,
  current +
    "\n# Locally generated agent identity. Do not commit this file.\n" +
    Object.entries(additions)
      .map(([name, value]) => `${name}=${value}`)
      .join("\n") +
    "\n",
  { mode: 0o600 },
);
chmodSync(envPath, 0o600);
console.log(
  "Created a public verification key and private local environment configuration. Test payments remain disabled.",
);
