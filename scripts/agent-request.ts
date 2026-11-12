import { agentFetch } from "../lib/agents/signing";

async function main() {
  const url = process.argv[2];
  if (!url || process.argv.length !== 3)
    throw new Error(
      "Usage: npm run agents:fetch -- https://example.com/resource",
    );
  const response = await agentFetch(url);
  process.stdout.write(await response.text());
  if (!response.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "The signed request failed.",
  );
  process.exitCode = 1;
});
