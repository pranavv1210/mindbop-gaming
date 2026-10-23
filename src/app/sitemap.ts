import type { MetadataRoute } from "next";
import { games } from "@/lib/games";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mindbop-gaming.onrender.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicGames = games
    .filter((game) => game.status === "playable" && game.route)
    .map((game) => ({
      url: `${siteUrl}${game.route}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/play`, changeFrequency: "weekly", priority: 0.9 },
    ...publicGames,
    { url: `${siteUrl}/developers`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
