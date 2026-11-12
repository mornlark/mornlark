import { getProduct } from "@/lib/agents/catalog";
import { json, problem } from "@/lib/agents/http";
export async function GET(
  _request: Request,
  context: RouteContext<"/api/products/[id]">,
) {
  try {
    return json(getProduct((await context.params).id));
  } catch (error) {
    return problem(error);
  }
}
