import { z } from "zod";
import { AgentError, createQuote, getProduct, searchProducts } from "./catalog";
import { checkOrigin, json, problem, readJson } from "./http";
import { AP2_EXTENSION } from "./site";

const messageRequest = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string().max(128), z.number()]),
  method: z.string().max(100),
  params: z
    .object({
      message: z.object({
        messageId: z.string().min(1).max(128),
        role: z.enum(["ROLE_USER", "user"]),
        parts: z
          .array(
            z.object({
              text: z.string().max(1000).optional(),
              data: z.record(z.string(), z.unknown()).optional(),
            }),
          )
          .min(1)
          .max(10),
        contextId: z.string().max(128).optional(),
      }),
    })
    .optional(),
});

export async function handleA2a(request: Request) {
  let id: string | number | null = null;
  try {
    checkOrigin(request);
    const parsed = messageRequest.parse(await readJson(request));
    id = parsed.id;
    if (parsed.method !== "SendMessage")
      return json({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: "Method not found. Supported method: SendMessage.",
        },
      });
    if (
      request.headers.has("a2a-version") &&
      request.headers.get("a2a-version") !== "1.0"
    )
      throw new AgentError(400, "Supported A2A version: 1.0.");
    const extensions = (request.headers.get("a2a-extensions") ?? "")
      .split(",")
      .map((value) => value.trim());
    if (!extensions.includes(AP2_EXTENSION))
      return json({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32003,
          message:
            "The merchant's required AP2 extension must be acknowledged in A2A-Extensions. This endpoint is a sandbox and cannot execute payments.",
          data: { requiredExtensions: [AP2_EXTENSION] },
        },
      });
    const message = parsed.params?.message;
    if (!message) throw new AgentError(400, "A message is required.");
    const data = message.parts.find((part) => part.data)?.data;
    let output: unknown;
    if (data?.action === "get_robot" && typeof data.id === "string")
      output = getProduct(data.id);
    else if (data?.action === "preview_quote")
      output = createQuote({ items: data.items });
    else if (data?.action === "search_robots")
      output = searchProducts(data.filters ?? {});
    else if (data)
      throw new AgentError(
        400,
        "Supported actions: search_robots, get_robot, preview_quote. Payment execution is disabled.",
      );
    else {
      const text = message.parts
        .map((part) => part.text ?? "")
        .join(" ")
        .trim();
      output = searchProducts({
        query: /^(list|catalog|show all)( robots)?[.!]?$/i.test(text)
          ? ""
          : text.replace(/^search\s+/i, ""),
      });
    }
    return json(
      {
        jsonrpc: "2.0",
        id,
        result: {
          message: {
            messageId: crypto.randomUUID(),
            role: "ROLE_AGENT",
            ...(message.contextId ? { contextId: message.contextId } : {}),
            parts: [{ text: JSON.stringify(output) }, { data: output }],
          },
        },
      },
      200,
      { "A2A-Version": "1.0", "A2A-Extensions": AP2_EXTENSION },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return json(
        {
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Invalid parameters." },
        },
        400,
      );
    return problem(error);
  }
}
