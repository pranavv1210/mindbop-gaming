export type DrawDifficulty = "easy" | "medium" | "hard";
export type DrawSettings = { rounds: number; drawTime: number; chooseTime: number; maxPlayers: number; difficulty: DrawDifficulty };
export type DrawPoint = { id: string; x: number; y: number; color: string; size: number; erase: boolean; start: boolean; opacity?: number; fill?: boolean };
export type DrawMessage = { id: string; playerId?: string; text: string; kind: "chat" | "correct" | "system"; at: number };
export type DrawAction = { type: "choose-word"; index: number } | { type: "guess"; text: string } | { type: "clear-canvas" } | { type: "fill-canvas"; color: string };
export type DrawView = {
  kind: "mindbop-draw"; runId: string; phase: "choosing" | "drawing" | "round-end" | "finished";
  playerIds: string[]; drawerId: string; round: number; totalRounds: number; turn: number; deadline: number;
  settings: DrawSettings; choices?: string[]; word: string; hint: string; strokes: DrawPoint[]; canvasVersion: number; messages: DrawMessage[];
  scores: Record<string, number>; guessed: string[]; lastWord?: string; lastScores?: Record<string, number>;
  winnerIds: string[]; finished: boolean;
  guessFeedback?: string;
};
