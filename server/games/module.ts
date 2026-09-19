import type { GameView } from "../../src/lib/protocol";
export interface GameModule<State = unknown> {
  id: string;
  create(rounds: number, now: number): State;
  act(state: State, playerId: string, action: unknown, now: number): void;
  tick(
    state: State,
    players: string[],
    now: number,
  ): Record<string, number> | null;
  finished(state: State): boolean;
  project(state: State, playerId: string): GameView;
}
