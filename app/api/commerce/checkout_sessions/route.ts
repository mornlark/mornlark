import { createCheckoutPreview } from "@/lib/agents/commerce";
import { checkOrigin, json, problem, readJson } from "@/lib/agents/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    return json(createCheckoutPreview(await readJson(request)), 201);
  } catch (error) {
    return problem(error);
  }
}
