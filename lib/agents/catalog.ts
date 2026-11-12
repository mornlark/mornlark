import { z } from "zod";
import { categories, products } from "@/app/catalog";
import { absoluteUrl } from "./site";

export const searchInput = z
  .object({
    query: z.string().trim().max(200).optional(),
    category: z.enum(categories).optional(),
    maxPrice: z.number().finite().min(0).max(1_000_000).optional(),
    sort: z.enum(["featured", "price-low", "price-high"]).optional(),
  })
  .strict();

export const productIdInput = z
  .object({ id: z.string().min(1).max(64) })
  .strict();

export const quoteInput = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.string().min(1).max(64),
            quantity: z.number().int().min(1).max(99),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();

export class AgentError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function publicProduct(product: (typeof products)[number]) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    summary: product.tagline,
    category: product.category,
    price: { amount: product.price * 100, currency: "USD", unit: "minor" },
    features: product.features,
    url: absoluteUrl("/#robots"),
    illustrative: true,
  };
}

export function searchProducts(input: unknown = {}) {
  const filters = searchInput.parse(input);
  const query = filters.query?.toLocaleLowerCase() ?? "";
  const found = products.filter(
    (product) =>
      (!query ||
        `${product.name} ${product.tagline} ${product.description} ${product.category}`
          .toLocaleLowerCase()
          .includes(query)) &&
      (!filters.category ||
        filters.category === "All robots" ||
        product.category === filters.category) &&
      (filters.maxPrice === undefined || product.price <= filters.maxPrice),
  );
  if (filters.sort === "price-low") found.sort((a, b) => a.price - b.price);
  if (filters.sort === "price-high") found.sort((a, b) => b.price - a.price);
  return {
    mode: "sandbox",
    products: found.map(publicProduct),
    total: found.length,
    currency: "USD",
  };
}

export function getProduct(id: string) {
  const product = products.find((product) => product.id === id);
  if (!product) throw new AgentError(404, "Product not found.");
  return publicProduct(product);
}

export function createQuote(input: unknown) {
  const { items } = quoteInput.parse(input);
  const quantities = new Map<string, number>();
  for (const item of items) {
    const quantity = (quantities.get(item.id) ?? 0) + item.quantity;
    if (quantity > 99)
      throw new AgentError(400, "A product quantity cannot exceed 99.");
    quantities.set(item.id, quantity);
  }
  const lines = [...quantities].map(([id, quantity]) => {
    const product = getProduct(id);
    return {
      id,
      name: product.name,
      quantity,
      unit_amount: product.price.amount,
      total_amount: product.price.amount * quantity,
    };
  });
  const total = lines.reduce((sum, line) => sum + line.total_amount, 0);
  return {
    mode: "sandbox",
    currency: "USD",
    unit: "minor",
    items: lines,
    subtotal_amount: total,
    shipping_amount: 0,
    total_amount: total,
    taxes: "not_calculated",
    payment_required: false,
    fulfillment_available: false,
    notice:
      "Illustrative quote only. No payment is collected and no order is placed.",
  };
}
