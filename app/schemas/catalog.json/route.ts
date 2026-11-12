import { json } from "@/lib/agents/http";
import { absoluteUrl } from "@/lib/agents/site";
export function GET() {
  return json(
    {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: absoluteUrl("/schemas/catalog.json"),
      title: "MornLark catalog search",
      type: "object",
      properties: {
        query: { type: "string", maxLength: 200 },
        category: {
          type: "string",
          enum: [
            "All robots",
            "Home & living",
            "Companions",
            "Work & industry",
          ],
        },
        maxPrice: { type: "number", minimum: 0, maximum: 1000000 },
        sort: { type: "string", enum: ["featured", "price-low", "price-high"] },
      },
      additionalProperties: false,
    },
    200,
    {
      "Content-Type": "application/schema+json",
      "Cache-Control": "public, max-age=300",
    },
  );
}
