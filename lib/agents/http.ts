import { z } from "zod";
import { AgentError } from "./catalog";
import { CONTENT_SIGNAL, DISCOVERY_LINKS } from "./site";

export const publicHeaders = {
  "Content-Signal": CONTENT_SIGNAL,
  "X-Content-Type-Options": "nosniff",
  Link: DISCOVERY_LINKS,
};

export function json(value: unknown, status = 200, headers: HeadersInit = {}) {
  const result = new Headers(publicHeaders);
  result.set("Cache-Control", "no-store");
  new Headers(headers).forEach((value, key) => result.set(key, value));
  return Response.json(value, { status, headers: result });
}

export function markdown(body: string, headers: HeadersInit = {}) {
  const result = new Headers(publicHeaders);
  result.set("Content-Type", "text/markdown; charset=utf-8");
  result.set("Cache-Control", "public, max-age=300");
  new Headers(headers).forEach((value, key) => result.set(key, value));
  return new Response(body, { headers: result });
}

export function problem(error: unknown) {
  const validation = error instanceof z.ZodError;
  const status = validation
    ? 400
    : error instanceof AgentError
      ? error.status
      : 500;
  return json(
    {
      type: "about:blank",
      title: status === 500 ? "Internal server error" : "Invalid request",
      status,
      detail: validation
        ? "Input does not match the documented schema."
        : error instanceof AgentError
          ? error.message
          : "The request could not be completed.",
    },
    status,
    { "Content-Type": "application/problem+json" },
  );
}

export async function readJson(
  request: Request,
  limit = 32_768,
): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    throw new AgentError(415, "Use Content-Type: application/json.");
  }
  if (Number(request.headers.get("content-length")) > limit)
    throw new AgentError(413, "Request body is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new AgentError(400, "A JSON body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new AgentError(413, "Request body is too large.");
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new AgentError(400, "Request body must be valid UTF-8 JSON.");
  }
}

export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  const local =
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
    origin === url.origin;
  if (origin && origin !== "https://mornlark.com" && !local) {
    throw new AgentError(403, "Cross-origin requests are not supported.");
  }
}
