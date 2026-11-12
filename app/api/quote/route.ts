import { createQuote } from "@/lib/agents/catalog";
import { checkOrigin, json, problem, readJson } from "@/lib/agents/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    return json(createQuote(await readJson(request)));
  } catch (error) {
    return problem(error);
  }
}
