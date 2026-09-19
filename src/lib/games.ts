export type GameInfo = {
  id: string;
  name: string;
  category: string;
  description: string;
  min: number;
  max: number;
  duration: string;
  status: "playable" | "soon";
  color: string;
  cover: string;
};
export const games: GameInfo[] = [
  {
    id: "last-guest",
    name: "The Last Guest",
    category: "Cooperative murder mystery",
    description:
      "A storm. A dead hotel owner. An alibi that doesn’t add up. Explore the Halcyon Hotel and build a case together.",
    min: 2,
    max: 6,
    duration: "Short case",
    status: "playable",
    color: "violet",
    cover: "/images/games/last-guest.svg",
  },
  {
    id: "signal-lost", name: "Signal Lost", category: "Social deduction",
    description: "Your research station has gone quiet. Repair the signal, read the room, and find the mimic before it finds you.",
    min: 4, max: 8, duration: "20–30 min", status: "soon", color: "mint",
    cover: "/images/games/signal-lost.svg",
  },
  {
    id: "spellbound", name: "Spellbound", category: "Team word game",
    description: "Build impossible spells from chaotic clues while the other team tries to break your magic.",
    min: 3, max: 10, duration: "15–25 min", status: "soon", color: "coral",
    cover: "/images/games/spellbound.svg",
  },
];
export const categories = [
  "All games",
  ...new Set(games.map((g) => g.category)),
];
