import { z } from "zod";
import { checkOrigin, json, problem, readJson } from "@/lib/agents/http";
const input = z
  .object({ name: z.string().trim().min(1).max(80).optional() })
  .strict();
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    input.parse(await readJson(request));
    return json({
      identity_type: "anonymous",
      registration: "not_required",
      credential: { type: "none" },
      scopes: ["catalog:read", "quote:preview"],
      account_created: false,
    });
  } catch (error) {
    return problem(error);
  }
}
