import type { MetadataRoute } from "next";
import { games } from "@/lib/games";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mindbop-gaming.onrender.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    { path: "/", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/play", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/developers", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.2 },
    { path: "/terms", changeFrequency: "yearly" as const, priority: 0.2 },
    { path: "/sitemap.html", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/ai-sitemap.html", changeFrequency: "monthly" as const, priority: 0.5 },
  ];

  const gameRoutes = games
    .filter((game) => game.status === "playable")
    .map((game) => ({
      path: game.route && game.mode !== "multiplayer" ? game.route : `/play/game/${game.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

  const routes = [...staticRoutes, ...gameRoutes];
  const seen = new Set<string>();

  return routes
    .filter((route) => {
      if (seen.has(route.path)) return false;
      seen.add(route.path);
      return true;
    })
    .map((route) => ({
      url: `${siteUrl}${route.path}`,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }));
}
