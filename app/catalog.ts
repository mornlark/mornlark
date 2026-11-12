export type Category =
  "All robots" | "Home & living" | "Companions" | "Work & industry";
export type Product = {
  id: string;
  name: string;
  tagline: string;
  price: number;
  originalPrice?: number;
  category: Category;
  badge: string;
  badgeStyle: string;
  rating: string;
  reviews: number;
  art: string;
  description: string;
  features: [string, string, string];
};
export const categories: Category[] = [
  "All robots",
  "Home & living",
  "Companions",
  "Work & industry",
];
export const products: Product[] = [
  {
    id: "atlas",
    name: "Atlas One",
    tagline: "Humanoid assistance for the workplace.",
    price: 2499,
    category: "Work & industry",
    badge: "Bestseller",
    badgeStyle: "green",
    rating: "4.9",
    reviews: 128,
    art: "atlas",
    description:
      "Make room for a more capable everyday. Atlas One brings thoughtful assistance to your workspace, with natural conversation, precise movement, and a personality that feels right at home.",
    features: [
      "8-hour battery life",
      "Natural voice control",
      "Adaptive learning",
    ],
  },
  {
    id: "scout",
    name: "Scout",
    tagline: "A four-legged companion for exploration.",
    price: 1299,
    category: "Companions",
    badge: "New arrival",
    badgeStyle: "white",
    rating: "4.8",
    reviews: 86,
    art: "scout",
    description:
      "Curious by design. Scout is an adventurous four-legged companion with intelligent obstacle avoidance and a playful personality. Explore your world together, one little step at a time.",
    features: [
      "All-terrain movement",
      "Smart obstacle avoidance",
      "4-hour play time",
    ],
  },
  {
    id: "cleanbot",
    name: "Cleanbot Pro",
    tagline: "Vacuuming and mopping, handled together.",
    price: 649,
    originalPrice: 799,
    category: "Home & living",
    badge: "Save $150",
    badgeStyle: "peach",
    rating: "4.9",
    reviews: 214,
    art: "cleanbot",
    description:
      "Your floors, taken care of. Cleanbot Pro maps your space, finds the mess, and quietly gets to work. Smart vacuuming and mopping give you more time for the things that matter.",
    features: [
      "Vacuum + mop",
      "Intelligent room mapping",
      "Self-charging dock",
    ],
  },
  {
    id: "miko",
    name: "Miko Mini",
    tagline: "A companion for your desk.",
    price: 349,
    category: "Companions",
    badge: "Community favorite",
    badgeStyle: "white",
    rating: "4.9",
    reviews: 172,
    art: "miko",
    description:
      "A little spark of joy for your desk. Miko Mini is a curious companion that responds to your voice, helps you focus, and always has a friendly face waiting when you need a break.",
    features: [
      "Expressive interactions",
      "Focus + break reminders",
      "USB-C charging",
    ],
  },
];
export function money(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
