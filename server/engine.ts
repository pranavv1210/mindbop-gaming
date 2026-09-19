import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Player, Reply, RoomView } from "../src/lib/protocol";
import { games } from "../src/lib/games";
import { modules } from "./games/registry";

const name = z
  .string()
  .trim()
  .min(1)
  .max(24)
  .refine((s) => !/[\u0000-\u001f\u007f]/.test(s));
const rounds = z.union([z.literal(3), z.literal(5), z.literal(8)]);
const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create"),
    name,
    avatar: z.number().int().min(0).max(5),
    gameId: z.string().max(40),
    rounds,
  }),
  z.object({
    type: z.literal("join"),
    name,
    avatar: z.number().int().min(0).max(5),
    code: z.string().regex(/^[A-Z2-9]{6}$/),
  }),
  z.object({ type: z.literal("ready"), ready: z.boolean() }),
  z.object({ type: z.literal("settings"), rounds }),
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("rematch") }),
  z.object({ type: z.literal("leave") }),
  z.object({
    type: z.literal("answer"),
    option: z.number().int().min(0).max(3),
    round: z.number().int().positive(),
  }),
]);
const envelopeSchema = z.object({
  id: z.string().uuid(),
  command: commandSchema,
});
type Member = Player & { disconnectedAt?: number };
type Room = {
  code: string;
  gameId: string;
  hostId: string;
  players: Member[];
  phase: RoomView["phase"];
  rounds: number;
  createdAt: number;
  updatedAt: number;
  state: unknown;
};
export type Session = {
  id: string;
  token: string;
  room?: string;
  sockets: Set<string>;
  lastSeen: number;
  actions: Map<string, Reply>;
  rate: number[];
};
export class Engine {
  rooms = new Map<string, Room>();
  sessions = new Map<string, Session>();
  constructor(private now: () => number = Date.now) {}
  session(token?: string): Session {
    const existing = token ? this.sessions.get(token) : undefined;
    if (existing) {
      existing.lastSeen = this.now();
      return existing;
    }
    if (this.sessions.size >= 10000)
      throw new Error("The server is busy. Try again shortly.");
    const s: Session = {
      id: randomUUID(),
      token: randomBytes(32).toString("hex"),
      sockets: new Set(),
      lastSeen: this.now(),
      actions: new Map(),
      rate: [],
    };
    this.sessions.set(s.token, s);
    return s;
  }
  connect(s: Session, socketId: string) {
    s.sockets.add(socketId);
    s.lastSeen = this.now();
    const room = this.rooms.get(s.room ?? "");
    const p = room?.players.find((p) => p.id === s.id);
    if (p && room) {
      p.connected = true;
      delete p.disconnectedAt;
      this.transfer(room);
    }
  }
  disconnect(s: Session, socketId: string) {
    s.sockets.delete(socketId);
    s.lastSeen = this.now();
    if (s.sockets.size) return;
    const room = this.rooms.get(s.room ?? "");
    const p = room?.players.find((p) => p.id === s.id);
    if (room && p) {
      p.connected = false;
      p.ready = false;
      p.disconnectedAt = this.now();
      this.transfer(room);
    }
  }
  private transfer(room: Room) {
    if (!room.players.some((p) => p.id === room.hostId && p.connected))
      room.hostId =
        room.players.find((p) => p.connected)?.id ?? room.players[0]?.id ?? "";
  }
  private leave(s: Session) {
    const room = this.rooms.get(s.room ?? "");
    if (room) {
      room.players = room.players.filter((p) => p.id !== s.id);
      this.transfer(room);
      if (!room.players.length) this.rooms.delete(room.code);
    }
    s.room = undefined;
  }
  command(s: Session, input: unknown): Reply {
    const parsed = envelopeSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false, error: "Check your details and try again." };
    const { id, command: c } = parsed.data;
    if (s.actions.has(id)) return s.actions.get(id)!;
    s.rate = s.rate.filter((t) => this.now() - t < 10000);
    if (s.rate.length >= 30)
      return {
        ok: false,
        error: "Too many actions. Wait a moment and try again.",
      };
    s.rate.push(this.now());
    s.lastSeen = this.now();
    let result: Reply;
    try {
      if (c.type === "leave") {
        this.leave(s);
        result = { ok: true };
      } else if (c.type === "create" || c.type === "join") {
        if (s.room)
          throw new Error("Leave your current room before entering another.");
        let room: Room;
        if (c.type === "create") {
          if (!modules.has(c.gameId))
            throw new Error("This game is coming soon.");
          if (this.rooms.size >= 500)
            throw new Error("All rooms are busy. Try again shortly.");
          const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          let code: string;
          do {
            code = Array.from(
              { length: 6 },
              () => alphabet[randomInt(alphabet.length)],
            ).join("");
          } while (this.rooms.has(code));
          room = {
            code,
            gameId: c.gameId,
            hostId: s.id,
            players: [],
            phase: "waiting",
            rounds: c.rounds,
            createdAt: this.now(),
            updatedAt: this.now(),
            state: null,
          };
          this.rooms.set(code, room);
        } else {
          const found = this.rooms.get(c.code);
          if (!found)
            throw new Error(
              "Room not found. Check the code; the room may have expired.",
            );
          room = found;
          if (room.phase !== "waiting")
            throw new Error(
              "This game has already started. Ask the host for a rematch.",
            );
          if (
            room.players.length >= games.find((g) => g.id === room.gameId)!.max
          )
            throw new Error("This room is full.");
        }
        room.players.push({
          id: s.id,
          name: c.name,
          avatar: c.avatar,
          connected: true,
          ready: false,
          score: 0,
        });
        room.updatedAt = this.now();
        s.room = room.code;
        result = { ok: true, code: room.code };
      } else {
        const room = this.rooms.get(s.room ?? "");
        if (!room)
          throw new Error(
            "Your room has expired. Create or join another room.",
          );
        const p = room.players.find((p) => p.id === s.id);
        if (!p || !p.connected)
          throw new Error("Reconnect to your room first.");
        const mod = modules.get(room.gameId)!;
        if (
          c.type === "settings" ||
          c.type === "start" ||
          c.type === "rematch"
        ) {
          if (room.hostId !== s.id)
            throw new Error("Only the host can do that.");
        }
        if (c.type === "settings") {
          if (room.phase !== "waiting")
            throw new Error("Settings are locked during a game.");
          room.rounds = c.rounds;
          room.players.forEach((p) => {
            p.ready = false;
          });
        }
        if (c.type === "ready") {
          if (room.phase !== "waiting")
            throw new Error("The game has already started.");
          p.ready = c.ready;
        }
        if (c.type === "start") {
          if (room.phase !== "waiting")
            throw new Error("This game has already started.");
          if (
            room.players.filter((p) => p.connected).length <
            games.find((g) => g.id === room.gameId)!.min
          )
            throw new Error("You need at least 2 connected players.");
          if (room.players.some((p) => !p.connected || !p.ready))
            throw new Error("Everyone needs to be connected and ready.");
          room.state = mod.create(room.rounds, this.now());
          room.phase = "playing";
        }
        if (c.type === "answer") {
          if (room.phase !== "playing")
            throw new Error("There is no question to answer yet.");
          mod.act(room.state, s.id, c, this.now());
        }
        if (c.type === "rematch") {
          if (room.phase !== "completed")
            throw new Error("Finish this game first.");
          room.phase = "waiting";
          room.state = null;
          room.players.forEach((p) => {
            p.score = 0;
            p.ready = false;
          });
        }
        room.updatedAt = this.now();
        result = { ok: true, code: room.code };
      }
    } catch (e) {
      result = {
        ok: false,
        error:
          e instanceof Error
            ? e.message
            : "That action could not be completed.",
      };
    }
    s.actions.set(id, result);
    if (s.actions.size > 100) s.actions.delete(s.actions.keys().next().value!);
    return result;
  }
  tick() {
    for (const room of this.rooms.values()) {
      const expired = room.players.filter(
        (p) =>
          !p.connected &&
          this.now() - (p.disconnectedAt ?? this.now()) >= 120000,
      );
      for (const p of expired) {
        const s = [...this.sessions.values()].find((s) => s.id === p.id);
        if (s) this.leave(s);
      }
      if (!this.rooms.has(room.code)) continue;
      if (this.now() - room.updatedAt > 3600000) {
        for (const s of this.sessions.values())
          if (s.room === room.code) s.room = undefined;
        this.rooms.delete(room.code);
        continue;
      }
      if (room.phase === "playing") {
        const mod = modules.get(room.gameId)!;
        const scores = mod.tick(
          room.state,
          room.players.map((p) => p.id),
          this.now(),
        );
        if (scores) for (const p of room.players) p.score += scores[p.id] ?? 0;
        if (mod.finished(room.state)) room.phase = "completed";
      }
    }
    for (const [token, s] of this.sessions)
      if (!s.sockets.size && !s.room && this.now() - s.lastSeen > 86400000)
        this.sessions.delete(token);
  }
  view(s: Session): RoomView | null {
    const r = this.rooms.get(s.room ?? "");
    if (!r) return null;
    return {
      code: r.code,
      gameId: r.gameId,
      hostId: r.hostId,
      phase: r.phase,
      rounds: r.rounds,
      createdAt: r.createdAt,
      players: r.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        connected: p.connected,
        ready: p.ready,
        score: p.score,
      })),
      game: r.state ? modules.get(r.gameId)!.project(r.state, s.id) : null,
      serverTime: this.now(),
    };
  }
}
