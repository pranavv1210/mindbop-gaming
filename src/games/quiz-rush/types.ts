export type QuizRushAction = { type: "answer"; option: number };
export type QuizRushView = {
  kind: "quiz-rush";
  runId: string;
  playerIds: string[];
  round: number;
  totalRounds: number;
  prompt: string;
  options: string[];
  scores: Record<string, number>;
  answered: string[];
  lastResult: Record<string, boolean>;
  winnerIds: string[];
  finished: boolean;
};
