import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Player, Reply, RoomView } from "../src/lib/protocol";
import { games } from "../src/lib/games";
import { modules } from "./games/registry";
import { caseActionSchema } from "./games/last-guest/module";
import { fourRowActionSchema } from "./games/four-row/module";
import { wordChainActionSchema } from "./games/word-chain/module";
import { quizRushActionSchema } from "./games/quiz-rush/module";

const name = z
  .string()
  .trim()
  .min(1)
  .max(24)
  .refine((s) => !/[\u0000-\u001f\u007f]/.test(s));
const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create"),
    name,
    avatar: z.number().int().min(0).max(5),
    gameId: z.string().max(40),
  }),
  z.object({
    type: z.literal("join"),
    name,
    avatar: z.number().int().min(0).max(5),
    code: z.string().regex(/^[A-Z2-9]{6}$/),
  }),
  z.object({ type: z.literal("ready"), ready: z.boolean() }),
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("rematch") }),
  z.object({ type: z.literal("leave") }),
  z.object({
    type: z.literal("game"),
    action: z.union([
      caseActionSchema,
      fourRowActionSchema,
      wordChainActionSchema,
      quizRushActionSchema,
    ]),
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
  lastMove?: number;
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
            room.players.length >=
            (games.find((g) => g.id === room.gameId)?.max ?? 6)
          )
            throw new Error("This room is full.");
        }
        room.players.push({
          id: s.id,
          name: c.name,
          avatar: c.avatar,
          connected: true,
          ready: false,
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
        if (c.type === "start" || c.type === "rematch") {
          if (room.hostId !== s.id)
            throw new Error("Only the host can do that.");
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
            (games.find((g) => g.id === room.gameId)?.min ?? 2)
          )
            throw new Error("You need at least 2 connected players.");
          if (room.players.some((p) => !p.connected || !p.ready))
            throw new Error("Everyone needs to be connected and ready.");
          room.state = mod.create(
            room.players.map((p) => p.id),
            this.now(),
          );
          room.phase = "playing";
        }
        if (c.type === "game") {
          if (room.phase !== "playing")
            throw new Error("Start the case before investigating.");
          if (c.action.type === "begin" && room.hostId !== s.id)
            throw new Error("Only the host can begin the investigation.");
          mod.tick(
            room.state,
            room.players.filter((p) => p.connected).map((p) => p.id),
            this.now(),
          );
          mod.act(room.state, s.id, c.action, this.now());
        }
        if (c.type === "rematch") {
          if (room.phase !== "completed")
            throw new Error("Finish this game first.");
          room.phase = "waiting";
          room.state = null;
          room.players.forEach((p) => {
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
  move(s: Session, raw: unknown) {
    const input = z
      .object({
        x: z.number().finite().min(-1).max(1),
        z: z.number().finite().min(-1).max(1),
      })
      .safeParse(raw);
    if (!input.success) return;
    const stopping = input.data.x === 0 && input.data.z === 0;
    if (!stopping && this.now() - (s.lastMove ?? -100) < 40) return;
    s.lastMove = this.now();
    const room = this.rooms.get(s.room ?? "");
    if (
      !room ||
      room.phase !== "playing" ||
      !room.players.some((p) => p.id === s.id && p.connected)
    )
      return;
    modules
      .get(room.gameId)!
      .input?.(room.state, s.id, input.data.x, input.data.z, this.now());
    room.updatedAt = this.now();
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
        mod.tick(
          room.state,
          room.players.filter((p) => p.connected).map((p) => p.id),
          this.now(),
        );
        if (mod.finished(room.state)) room.phase = "completed";
      }
    }
    for (const [token, s] of this.sessions)
      if (!s.sockets.size && !s.room && this.now() - s.lastSeen > 86400000)
        this.sessions.delete(token);
  }
  // The registry projects distinct game views; callers narrow by `game.kind`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  view(s: Session): RoomView<any> | null {
    const r = this.rooms.get(s.room ?? "");
    if (!r) return null;
    return {
      code: r.code,
      gameId: r.gameId,
      hostId: r.hostId,
      phase: r.phase,
      createdAt: r.createdAt,
      players: r.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        connected: p.connected,
        ready: p.ready,
      })),
      game: r.state ? modules.get(r.gameId)!.project(r.state, s.id) : null,
      serverTime: this.now(),
    };
  }
}
