import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/person";
import { OPEN_SOURCE_PAGE } from "@/content/sections";

// Served at /sitemap.xml: the home page and the open-source page.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}${OPEN_SOURCE_PAGE.path}`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
