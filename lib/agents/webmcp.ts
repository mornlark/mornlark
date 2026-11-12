import {
  getProduct,
  productIdInput,
  quoteInput,
  createQuote,
  searchInput,
  searchProducts,
} from "./catalog";

type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint: boolean };
  execute: (input: unknown) => Promise<unknown>;
};
type ModelContext = {
  registerTool: (
    tool: Tool,
    options?: { signal: AbortSignal },
  ) => void | Promise<void>;
  unregisterTool?: (name: string) => void;
};
type Actions = {
  search: (input: ReturnType<typeof searchInput.parse>) => void;
  view: (id: string) => void;
};

export function registerStorefrontTools(actions: Actions) {
  // Early implementations expose navigator.modelContext; the current draft uses document.modelContext.
  const context =
    (navigator as Navigator & { modelContext?: ModelContext }).modelContext ??
    (document as Document & { modelContext?: ModelContext }).modelContext;
  if (!context?.registerTool) return;
  const controller = new AbortController();
  const text = (value: unknown) => ({
    content: [{ type: "text", text: JSON.stringify(value) }],
  });
  const tools: Tool[] = [
    {
      name: "search_robots",
      description:
        "Search and filter the visible robot catalog. No order or payment is created.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
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
          sort: {
            type: "string",
            enum: ["featured", "price-low", "price-high"],
          },
        },
      },
      annotations: { readOnlyHint: true },
      execute: async (input) => {
        const filters = searchInput.parse(input);
        actions.search(filters);
        return text(searchProducts(filters));
      },
    },
    {
      name: "get_robot",
      description:
        "Retrieve a robot's public illustrative specifications and price.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: { id: { type: "string", maxLength: 64 } },
        required: ["id"],
      },
      annotations: { readOnlyHint: true },
      execute: async (input) =>
        text(getProduct(productIdInput.parse(input).id)),
    },
    {
      name: "view_robot",
      description:
        "Open the robot detail dialog on this page. Does not add it to the bag or purchase it.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: { id: { type: "string", maxLength: 64 } },
        required: ["id"],
      },
      annotations: { readOnlyHint: true },
      execute: async (input) => {
        const product = getProduct(productIdInput.parse(input).id);
        actions.view(product.id);
        return text(product);
      },
    },
    {
      name: "navigate_store",
      description:
        "Navigate to the catalog, story or delivery section of this page.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          section: {
            type: "string",
            enum: ["robots", "our-story", "why-robo"],
          },
        },
        required: ["section"],
      },
      annotations: { readOnlyHint: true },
      execute: async (input) => {
        if (
          !input ||
          typeof input !== "object" ||
          !("section" in input) ||
          !["robots", "our-story", "why-robo"].includes(String(input.section))
        )
          throw new Error("Choose a known store section.");
        document
          .getElementById(String(input.section))
          ?.scrollIntoView({ behavior: "auto" });
        return text({ section: input.section });
      },
    },
    {
      name: "preview_quote",
      description:
        "Calculate a sandbox quote. No payment is collected and no order is placed.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          items: {
            type: "array",
            minItems: 1,
            maxItems: 20,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string", maxLength: 64 },
                quantity: { type: "integer", minimum: 1, maximum: 99 },
              },
              required: ["id", "quantity"],
            },
          },
        },
        required: ["items"],
      },
      annotations: { readOnlyHint: true },
      execute: async (input) => text(createQuote(quoteInput.parse(input))),
    },
  ];
  for (const tool of tools) {
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: controller.signal }),
      ).catch((error) => {
        if (!controller.signal.aborted)
          console.warn("WebMCP tool registration failed:", tool.name, error);
      });
    } catch (error) {
      if (!controller.signal.aborted)
        console.warn("WebMCP tool registration failed:", tool.name, error);
    }
  }
  return () => {
    controller.abort();
    for (const tool of tools) context.unregisterTool?.(tool.name);
  };
}
