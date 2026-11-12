import { searchProducts } from "@/lib/agents/catalog";
import { json, problem } from "@/lib/agents/http";

export function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const maxPrice = params.get("maxPrice");
    return json(
      searchProducts({
        query: params.get("q") ?? undefined,
        category: params.get("category") ?? undefined,
        sort: params.get("sort") ?? undefined,
        maxPrice: maxPrice === null ? undefined : Number(maxPrice),
      }),
    );
  } catch (error) {
    return problem(error);
  }
}
