export type WordChainAction = { type: "word"; word: string };
export type WordChainView = {
  kind: "word-chain";
  runId: string;
  playerIds: string[];
  turn: string;
  currentLetter: string;
  words: { word: string; by: string }[];
  scores: Record<string, number>;
  winner: string | null;
};
