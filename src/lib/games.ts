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
];
export const categories = [
  "All games",
  ...new Set(games.map((g) => g.category)),
];
