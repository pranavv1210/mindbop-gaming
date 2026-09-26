import type { GameView } from "../../src/lib/protocol";
export interface GameModule<State = unknown, View extends GameView = GameView> {
  id: string;
  create(players: string[], now: number): State;
  input?(
    state: State,
    playerId: string,
    x: number,
    z: number,
    now: number,
  ): void;
  act(state: State, playerId: string, action: unknown, now: number): void;
  tick(
    state: State,
    players: string[],
    now: number,
  ): Record<string, number> | null;
  finished(state: State): boolean;
  project(state: State, playerId: string): View;
}
