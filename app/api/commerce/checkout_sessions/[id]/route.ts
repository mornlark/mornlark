import { getCheckoutPreview } from "@/lib/agents/commerce";
import { json, problem } from "@/lib/agents/http";
export async function GET(
  _request: Request,
  context: RouteContext<"/api/commerce/checkout_sessions/[id]">,
) {
  try {
    return json(getCheckoutPreview((await context.params).id));
  } catch (error) {
    return problem(error);
  }
}
