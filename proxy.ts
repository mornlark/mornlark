import { NextRequest, NextResponse } from "next/server";
import { homepageMarkdown, prefersMarkdown } from "@/lib/agents/content";
import { CONTENT_SIGNAL, DISCOVERY_LINKS } from "@/lib/agents/site";

export function proxy(request: NextRequest) {
  const headers = {
    Vary: "Accept",
    Link: DISCOVERY_LINKS,
    "Content-Signal": CONTENT_SIGNAL,
  };
  if (
    ["GET", "HEAD"].includes(request.method) &&
    prefersMarkdown(request.headers.get("accept"))
  ) {
    return new NextResponse(
      request.method === "HEAD" ? null : homepageMarkdown(),
      {
        headers: {
          ...headers,
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Location": "/index.md",
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  }
  const response = NextResponse.next();
  // Next's page renderer replaces Vary. Keep HTML uncacheable so a shared
  // cache cannot reuse that representation for a Markdown request.
  response.headers.set("Cache-Control", "private, no-store");
  Object.entries(headers).forEach(([name, value]) =>
    response.headers.set(name, value),
  );
  return response;
}

export const config = { matcher: ["/"] };
