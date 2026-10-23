import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mindbop-gaming.onrender.com";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/play/room/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
