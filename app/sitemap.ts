import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  // Update these entries when public page routes are published or removed.
  return [{ url: "https://mornlark.com/" }];
}
