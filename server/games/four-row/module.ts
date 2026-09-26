import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { GameModule } from "../module";
import type { FourRowView } from "../../../src/games/four-row/types";

export const fourRowActionSchema = z.object({
  type: z.literal("drop"),
  column: z.number().int().min(0).max(6),
});

type FourRowState = FourRowView;

function winningLine(board: number[][], row: number, column: number) {
  const token = board[row][column];
  for (const [dr, dc] of [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]) {
    const cells: [number, number][] = [];
    for (let step = -3; step <= 3; step++) {
      const r = row + dr * step;
      const c = column + dc * step;
      if (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === token)
        cells.push([r, c]);
      else cells.length = 0;
      if (cells.length === 4) return cells;
    }
  }
  return [];
}

export const fourRow: GameModule<FourRowState, FourRowView> = {
  id: "four-row",
  create(players) {
    return {
      kind: "four-row",
      runId: randomUUID(),
      board: Array.from({ length: 6 }, () => Array(7).fill(0)),
      playerIds: players.slice(0, 2),
      turn: players[0],
      winner: null,
      draw: false,
      winningCells: [],
      moveCount: 0,
    };
  },
  act(state, playerId, raw) {
    const parsed = fourRowActionSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Choose a valid column.");
    if (state.winner || state.draw) throw new Error("This round is over.");
    if (state.turn !== playerId) throw new Error("Wait for your turn.");
    const column = parsed.data.column;
    let row = 5;
    while (row >= 0 && state.board[row][column] !== 0) row--;
    if (row < 0) throw new Error("That column is full.");
    const token = state.playerIds.indexOf(playerId) + 1;
    state.board[row][column] = token;
    state.moveCount++;
    state.winningCells = winningLine(state.board, row, column);
    if (state.winningCells.length) state.winner = playerId;
    else if (state.moveCount === 42) state.draw = true;
    else state.turn = state.playerIds[token === 1 ? 1 : 0];
  },
  tick() {
    return null;
  },
  finished: (state) => Boolean(state.winner || state.draw),
  project: (state) => structuredClone(state),
};
