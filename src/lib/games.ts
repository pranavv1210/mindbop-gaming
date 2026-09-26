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
    id: "four-row",
    name: "Four in a Row",
    category: "Quick strategy",
    description:
      "Drop discs, build traps, and block your rival. Connect four across, down, or diagonally to take the round.",
    min: 2,
    max: 2,
    duration: "5–10 min",
    status: "playable",
    color: "violet",
    cover: "/images/games/four-row.svg",
  },
  {
    id: "word-chain",
    name: "Word Chain",
    category: "Word party",
    description:
      "Keep the chain alive under pressure. Every new word must begin where the last one ended.",
    min: 2,
    max: 6,
    duration: "5–15 min",
    status: "playable",
    color: "mint",
    cover: "/images/games/word-chain.svg",
  },
  {
    id: "quiz-rush",
    name: "Quiz Rush",
    category: "Trivia battle",
    description:
      "Five surprising questions. Lock your answer, watch the scores, and outsmart the whole room.",
    min: 2,
    max: 8,
    duration: "5–10 min",
    status: "playable",
    color: "coral",
    cover: "/images/games/quiz-rush.svg",
  },
  {
    id: "sketch-relay",
    name: "Sketch Relay",
    category: "Creative party",
    description:
      "Draw, guess, and pass the chaos along before the original idea disappears completely.",
    min: 3,
    max: 8,
    duration: "15 min",
    status: "soon",
    color: "yellow",
    cover: "/images/games/sketch-relay.svg",
  },
  {
    id: "secret-signal",
    name: "Secret Signal",
    category: "Social bluffing",
    description:
      "Send coded clues to your teammate without letting the other side crack your secret signal.",
    min: 4,
    max: 10,
    duration: "20 min",
    status: "soon",
    color: "violet",
    cover: "/images/games/secret-signal.svg",
  },
];
export const categories = [
  "All games",
  ...new Set(games.map((game) => game.category)),
];
