export const games = [
  {
    id: "brainwave",
    name: "Brainwave",
    category: "Mind games",
    description:
      "Quick questions. Sneaky patterns. That glorious “I knew it!” moment.",
    min: 2,
    max: 8,
    duration: "3–5 min",
    status: "playable",
    color: "violet",
    symbol: "brain",
  },
  {
    id: "bluff-club",
    name: "Bluff Club",
    category: "Bluff & deception",
    description:
      "Make up a believable lie. Convince your friends it’s the truth.",
    min: 3,
    max: 8,
    duration: "10–15 min",
    status: "soon",
    color: "coral",
    symbol: "cards",
  },
  {
    id: "odd-one-in",
    name: "Odd One In",
    category: "Social deduction",
    description:
      "Someone doesn’t belong. A few good questions could give them away.",
    min: 4,
    max: 10,
    duration: "8–12 min",
    status: "soon",
    color: "mint",
    symbol: "eyes",
  },
  {
    id: "hot-take",
    name: "Hot Take",
    category: "Quick challenges",
    description:
      "Big opinions. Very little time. Find out how your friends really think.",
    min: 3,
    max: 8,
    duration: "5–8 min",
    status: "soon",
    color: "yellow",
    symbol: "bolt",
  },
] as const;
export type GameInfo = (typeof games)[number];
export const categories = [
  "All games",
  ...new Set(games.map((g) => g.category)),
];
