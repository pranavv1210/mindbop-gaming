export type Guest = { name: string; avatar: number };
export type Recent = {
  gameId: string;
  playedAt: number;
  outcome: string;
  matchId: string;
};
export function readGuest(): Guest {
  try {
    const saved = JSON.parse(localStorage.getItem("mindbop.guest") ?? "null");
    if (
      saved &&
      typeof saved.name === "string" &&
      saved.name.trim().length > 0 &&
      saved.name.length <= 24 &&
      Number.isInteger(saved.avatar) &&
      saved.avatar >= 0 &&
      saved.avatar <= 5
    )
      return saved;
  } catch {}
  return {
    name: `Guest ${Math.floor(100 + Math.random() * 900)}`,
    avatar: Math.floor(Math.random() * 6),
  };
}
export function saveGuest(guest: Guest) {
  try {
    localStorage.setItem("mindbop.guest", JSON.stringify(guest));
  } catch {
    /* Preferences remain available in memory when storage is blocked. */
  }
}
export function readRecent(): Recent[] {
  try {
    const items: unknown = JSON.parse(
      localStorage.getItem("mindbop.recent") ?? "[]",
    );
    return Array.isArray(items)
      ? items
          .filter(
            (r): r is Recent =>
              r &&
              typeof r.gameId === "string" &&
              typeof r.playedAt === "number" &&
              typeof r.outcome === "string" &&
              typeof r.matchId === "string",
          )
          .slice(0, 6)
      : [];
  } catch {
    return [];
  }
}
export function saveRecent(item: Recent) {
  try {
    const recent = readRecent();
    if (!recent.some((r) => r.matchId === item.matchId))
      localStorage.setItem(
        "mindbop.recent",
        JSON.stringify([item, ...recent].slice(0, 6)),
      );
  } catch {}
}
