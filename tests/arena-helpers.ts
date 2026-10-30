import { BTN, COUNTDOWN_TICKS, type HeroId } from "../src/arena/config";
import type { Cmd } from "../src/arena/codec";
import { quantizeAxis, quantizePitch, quantizeYaw, decodeSnapshot, type Snapshot } from "../src/arena/codec";
import type { ArenaMap, Solid } from "../src/arena/maps";
import { ALL, ArenaRoom, type RoomOut } from "../server/arena/room";

export type Captured = {
  events: Array<{ target: string; name: string; payload: any }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  snaps: Map<string, Uint8Array[]>;
};

export function makeOut(): { out: RoomOut; cap: Captured } {
  const cap: Captured = { events: [], snaps: new Map() };
  const out: RoomOut = {
    snapshot(id, data) {
      const list = cap.snaps.get(id) ?? [];
      list.push(data);
      if (list.length > 40) list.shift();
      cap.snaps.set(id, list);
    },
    event(target, name, payload) { cap.events.push({ target, name, payload }); },
  };
  return { out, cap };
}

export const solid = (id: string, minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number): Solid => ({
  id, minX, maxX, minY, maxY, minZ, maxZ, kind: "crate", tone: 0,
});

/** A flat 60 x 40 arena with optional solids, for isolated physics and combat tests. */
export function openMap(solids: Solid[] = []): ArenaMap {
  return {
    id: "foundry", name: "Test",
    bounds: { minX: -30, maxX: 30, minZ: -20, maxZ: 20 },
    solids,
    spawns: [
      [{ x: -26, z: -9, yaw: Math.PI / 2 }, { x: -26, z: 0, yaw: Math.PI / 2 }, { x: -26, z: 9, yaw: Math.PI / 2 }],
      [{ x: 26, z: -9, yaw: -Math.PI / 2 }, { x: 26, z: 0, yaw: -Math.PI / 2 }, { x: 26, z: 9, yaw: -Math.PI / 2 }],
    ],
    theme: { floor: "#000", wall: "#000", accent: "#000", accent2: "#000", fog: "#000", sky: "#000" },
  };
}

let seqCounter = 1;
export function cmd(p: Partial<Cmd> = {}): Cmd {
  return {
    seq: seqCounter++,
    mx: quantizeAxis(p.mx ?? 0), mz: quantizeAxis(p.mz ?? 0),
    yaw: quantizeYaw(p.yaw ?? 0), pitch: quantizePitch(p.pitch ?? 0),
    buttons: p.buttons ?? 0, weaponSel: p.weaponSel ?? 255,
    viewTick: p.viewTick ?? 0, viewFrac: p.viewFrac ?? 0,
  };
}
export const resetSeq = () => { seqCounter = 1; };

export function advance(room: ArenaRoom, ticks: number) {
  for (let i = 0; i < ticks; i++) room.step();
}

export function makeRoom(players: Array<{ id: string; hero?: HeroId }>, opts: { map?: ArenaMap; seed?: number; live?: boolean } = {}) {
  const { out, cap } = makeOut();
  const room = new ArenaRoom({ id: "TEST01", out, seed: opts.seed ?? 7, mapId: "foundry" });
  for (const p of players) {
    const joined = room.join(p.id, p.id, p.hero ?? "striker");
    if (!joined.ok) throw new Error(joined.error);
  }
  if (opts.live !== false && players.length >= 2) {
    advance(room, 1 + COUNTDOWN_TICKS + 1);
    if (room.phase !== "live") throw new Error(`expected live, got ${room.phase}`);
  }
  if (opts.map) {
    room.map = opts.map;
  }
  for (const m of room.allMembers()) m.protectUntil = 0;
  return { room, cap };
}

/** Put a member somewhere exact (feet position) with zero velocity. */
export function place(room: ArenaRoom, id: string, x: number, y: number, z: number) {
  const m = room.member(id)!;
  m.body.x = x; m.body.y = y; m.body.z = z; m.body.vx = 0; m.body.vy = 0; m.body.vz = 0; m.body.grounded = y === 0;
  m.alive = true;
  return m;
}

export function lastSnapshot(cap: Captured, id: string): Snapshot {
  const list = cap.snaps.get(id)!;
  const snap = decodeSnapshot(list[list.length - 1]);
  if (!snap) throw new Error("snapshot did not decode");
  return snap;
}

export { ALL, BTN };
