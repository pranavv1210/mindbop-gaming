export type ArenaPlayer = { id: string; x: number; y: number; z: number; rotation: number };
export type ArenaView = {
  kind: "mindbop-arena";
  runId: string;
  phase: "prototype";
  playerIds: string[];
  players: Record<string, ArenaPlayer>;
  finished: false;
};
export type ArenaAction = { type: "arena-pulse" };
