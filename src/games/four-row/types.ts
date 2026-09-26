export type FourRowAction = { type: "drop"; column: number };

export type FourRowView = {
  kind: "four-row";
  runId: string;
  board: number[][];
  playerIds: string[];
  turn: string;
  winner: string | null;
  draw: boolean;
  winningCells: [number, number][];
  moveCount: number;
};
