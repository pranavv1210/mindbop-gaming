import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { GameModule } from "../module";
import type {
  ArenaPlayer,
  ArenaView,
} from "../../../src/games/arena/types";

export const arenaActionSchema = z.object({ type: z.literal("arena-pulse") });
type Body = ArenaPlayer & {
  vx: number;
  vz: number;
  vy: number;
  inputX: number;
  inputZ: number;
  jump: boolean;
  sprint: boolean;
};
type State = ArenaView & { players: Record<string, Body>; lastTick: number };
const spawn = (id: string, index: number): Body => ({
  id,
  x: index % 2 ? 5 : -5,
  y: 1,
  z: Math.floor(index / 2) * 3 - 4,
  rotation: 0,
  vx: 0,
  vz: 0,
  vy: 0,
  inputX: 0,
  inputZ: 0,
  jump: false,
  sprint: false,
});

export const mindbopArena: GameModule<State, ArenaView> = {
  id: "mindbop-arena",
  create(ids, now) {
    if (ids.length < 2 || ids.length > 10)
      throw new Error("MindBop Arena needs 2–10 players.");
    return {
      kind: "mindbop-arena",
      runId: randomUUID(),
      phase: "prototype",
      playerIds: ids,
      players: Object.fromEntries(
        ids.map((id, index) => [id, spawn(id, index)]),
      ),
      finished: false,
      lastTick: now,
    };
  },
  input(state, id, x, z, _now, jump, sprint) {
    const player = state.players[id];
    if (!player) return;
    player.inputX = x;
    player.inputZ = z;
    player.jump ||= Boolean(jump);
    player.sprint = Boolean(sprint);
  },
  act(_state, _id, raw) {
    if (!arenaActionSchema.safeParse(raw).success)
      throw new Error("That Arena action is not valid.");
  },
  tick(state, connected, now) {
    const dt = Math.min(0.08, Math.max(0.01, (now - state.lastTick) / 1000));
    state.lastTick = now;
    for (const id of state.playerIds) {
      const player = state.players[id];
      if (!connected.includes(id)) continue;
      const grounded = player.y <= 1.01;
      if (grounded) {
        player.y = 1;
        player.vy = Math.max(0, player.vy);
        if (player.jump) player.vy = 8.5;
      }
      player.jump = false;
      const speed = player.sprint ? 10.5 : 8;
      player.vx += (player.inputX * speed - player.vx) * Math.min(1, dt * 10);
      player.vz += (player.inputZ * speed - player.vz) * Math.min(1, dt * 10);
      player.vy -= 20 * dt;
      player.x += player.vx * dt;
      player.z += player.vz * dt;
      player.y += player.vy * dt;
      if (player.y < 1) {
        player.y = 1;
        player.vy = 0;
      }
      player.x = Math.max(-18, Math.min(18, player.x));
      player.z = Math.max(-18, Math.min(18, player.z));
      if (player.inputX || player.inputZ)
        player.rotation = Math.atan2(player.inputX, player.inputZ);
    }
    return null;
  },
  finished: () => false,
  project(state) {
    return {
      kind: state.kind,
      runId: state.runId,
      phase: state.phase,
      playerIds: state.playerIds,
      players: Object.fromEntries(
        Object.entries(state.players).map(([id, p]) => [
          id,
          { id, x: p.x, y: p.y, z: p.z, rotation: p.rotation },
        ]),
      ),
      finished: false,
    };
  },
};
