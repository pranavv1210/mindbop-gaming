import { randomInt } from "node:crypto";
import { performance } from "node:perf_hooks";
import { EMPTY_ROOM_TTL_TICKS, type HeroId } from "../../src/arena/config";
import { ALL, ArenaRoom, type JoinResult, type RoomOut } from "./room";

export type DirectorOut = {
  snapshot(playerId: string, data: Uint8Array): void;
  event(playerId: string, name: string, payload: unknown): void;
  room(roomId: string, name: string, payload: unknown): void;
};

export type DirectorOptions = {
  maxRooms?: number;
  seed?: number;
  now?: () => number;
};

export type PlaceResult =
  | { ok: true; room: ArenaRoom; join: Extract<JoinResult, { ok: true }> }
  | { ok: false; error: string };

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const STAT_WINDOW = 600;

export class ArenaDirector {
  readonly rooms = new Map<string, ArenaRoom>();
  private readonly byPlayer = new Map<string, string>();
  private readonly maxRooms: number;
  private seed: number;
  private readonly now: () => number;
  private readonly durations = new Float64Array(STAT_WINDOW);
  private durationCount = 0;
  private durationIndex = 0;
  private totalTicks = 0;
  private slowTicks = 0;

  constructor(private readonly out: DirectorOut, opts: DirectorOptions = {}) {
    this.maxRooms = opts.maxRooms ?? 100;
    this.seed = opts.seed ?? 0x2545f491;
    this.now = opts.now ?? performance.now.bind(performance);
  }

  private newId() {
    let id: string;
    do id = Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
    while (this.rooms.has(id));
    return id;
  }

  private create(isPrivate: boolean): ArenaRoom | null {
    if (this.rooms.size >= this.maxRooms) return null;
    const id = this.newId();
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    const roomOut: RoomOut = {
      snapshot: (pid, data) => this.out.snapshot(pid, data),
      event: (target, name, payload) => (target === ALL ? this.out.room(id, name, payload) : this.out.event(target, name, payload)),
    };
    const room = new ArenaRoom({ id, out: roomOut, seed: this.seed, isPrivate });
    this.rooms.set(id, room);
    return room;
  }

  roomOf(playerId: string) {
    const id = this.byPlayer.get(playerId);
    return id ? this.rooms.get(id) : undefined;
  }

  private place(room: ArenaRoom, playerId: string, name: string, hero: HeroId): PlaceResult {
    const join = room.join(playerId, name, hero);
    if (!join.ok) return { ok: false, error: join.error };
    this.byPlayer.set(playerId, room.id);
    return { ok: true, room, join };
  }

  /** Put a player in the best public room, creating one when everything is full. */
  quickPlay(playerId: string, name: string, hero: HeroId): PlaceResult {
    const current = this.roomOf(playerId);
    if (current) return this.place(current, playerId, name, hero);
    let best: ArenaRoom | null = null;
    let bestScore = -Infinity;
    for (const room of this.rooms.values()) {
      if (room.isPrivate || room.isFull) continue;
      const score = room.connectedCount * 10 + (room.phase === "ended" ? -25 : 0) + (room.phase === "live" ? 3 : 0);
      if (score > bestScore) { best = room; bestScore = score; }
    }
    const room = best ?? this.create(false);
    if (!room) return { ok: false, error: "All arenas are busy right now. Try again in a moment." };
    return this.place(room, playerId, name, hero);
  }

  createPrivate(playerId: string, name: string, hero: HeroId): PlaceResult {
    const current = this.roomOf(playerId);
    if (current) this.leave(playerId);
    const room = this.create(true);
    if (!room) return { ok: false, error: "All arenas are busy right now. Try again in a moment." };
    return this.place(room, playerId, name, hero);
  }

  joinCode(playerId: string, code: string, name: string, hero: HeroId): PlaceResult {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return { ok: false, error: "Room not found. Check the code; the arena may have closed." };
    const current = this.roomOf(playerId);
    if (current && current !== room) this.leave(playerId);
    return this.place(room, playerId, name, hero);
  }

  leave(playerId: string) {
    const room = this.roomOf(playerId);
    this.byPlayer.delete(playerId);
    room?.leave(playerId);
  }

  disconnect(playerId: string) {
    this.roomOf(playerId)?.disconnect(playerId);
  }

  /** Advance every room by one tick. Returns how long it took in milliseconds. */
  tick(): number {
    const start = this.now();
    for (const room of this.rooms.values()) {
      room.step();
      // Rooms drop members after the disconnect grace period; keep the index consistent.
      if (room.size === 0 && room.tick - room.emptySince >= EMPTY_ROOM_TTL_TICKS) this.rooms.delete(room.id);
    }
    for (const [playerId, roomId] of this.byPlayer) {
      const room = this.rooms.get(roomId);
      if (!room || !room.has(playerId)) this.byPlayer.delete(playerId);
    }
    const took = this.now() - start;
    this.durations[this.durationIndex] = took;
    this.durationIndex = (this.durationIndex + 1) % STAT_WINDOW;
    this.durationCount = Math.min(STAT_WINDOW, this.durationCount + 1);
    this.totalTicks += 1;
    if (took > 25) this.slowTicks += 1;
    return took;
  }

  stats() {
    const sorted = Array.from(this.durations.subarray(0, this.durationCount)).sort((a, b) => a - b);
    const at = (q: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] : 0);
    let players = 0, connected = 0;
    for (const room of this.rooms.values()) { players += room.size; connected += room.connectedCount; }
    return {
      rooms: this.rooms.size,
      players,
      connected,
      ticks: this.totalTicks,
      slowTicks: this.slowTicks,
      tickMs: { p50: +at(0.5).toFixed(3), p95: +at(0.95).toFixed(3), p99: +at(0.99).toFixed(3), max: +(sorted.at(-1) ?? 0).toFixed(3) },
    };
  }
}
