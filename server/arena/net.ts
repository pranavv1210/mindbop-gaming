import type { IncomingMessage } from "node:http";
import { performance } from "node:perf_hooks";
import type { Server } from "socket.io";
import { z } from "zod";
import { HERO_IDS, TICK_MS } from "../../src/arena/config";
import { decodeCmd } from "../../src/arena/codec";
import type { ArenaClientEvents, ArenaServerEvents, JoinReply } from "../../src/arena/protocol";
import { ArenaDirector, type DirectorOptions } from "./director";

const joinSchema = z.object({
  name: z.string().max(40),
  hero: z.enum(HERO_IDS as [string, ...string[]]),
  mode: z.enum(["quick", "create", "code"]),
  code: z.string().regex(/^[A-Za-z2-9]{6}$/).optional(),
});
const heroSchema = z.object({ hero: z.enum(HERO_IDS as [string, ...string[]]) });

/** Token bucket: `rate` tokens per second with a burst allowance. */
class Bucket {
  private tokens: number;
  private last = performance.now();
  constructor(private readonly rate: number, private readonly burst: number) { this.tokens = burst; }
  take() {
    const now = performance.now();
    this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 1000) * this.rate);
    this.last = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}

type SocketData = { playerId: string; cmd: Bucket; join: Bucket; hero: Bucket };
export type ArenaSession = { id: string };

export type ArenaServer = {
  director: ArenaDirector;
  stats: () => ReturnType<ArenaDirector["stats"]> & { sockets: number };
  close: () => void;
};

export function registerArena(
  io: Server,
  resolveSession: (req: IncomingMessage) => ArenaSession | undefined,
  opts: DirectorOptions & { autoTick?: boolean } = {},
): ArenaServer {
  const nsp = io.of("/arena");
  type ArenaSocket = ReturnType<typeof nsp.sockets.get> & {};
  const sockets = new Map<string, ArenaSocket>();
  const typedEmit = (target: { emit: (event: string, ...args: unknown[]) => unknown }, name: string, payload: unknown) => target.emit(name, payload);

  const director = new ArenaDirector({
    snapshot(playerId, data) {
      const s = sockets.get(playerId);
      if (s) (s.volatile as unknown as { emit: (e: string, d: unknown) => void }).emit("snap", data);
    },
    event(playerId, name, payload) {
      const s = sockets.get(playerId);
      if (s) typedEmit(s, name, payload);
    },
    room(roomId, name, payload) {
      typedEmit(nsp.to(roomId), name, payload);
    },
  }, opts);

  nsp.use((socket, next) => {
    const session = resolveSession(socket.request);
    if (!session) return next(new Error("Session expired. Refresh to reconnect."));
    const data: SocketData = { playerId: session.id, cmd: new Bucket(75, 40), join: new Bucket(0.5, 4), hero: new Bucket(1, 4) };
    socket.data = data;
    next();
  });

  nsp.on("connection", (socket) => {
    const data = socket.data as SocketData;
    const playerId = data.playerId;
    const previous = sockets.get(playerId);
    if (previous && previous.id !== socket.id) {
      typedEmit(previous, "kicked", { reason: "You joined the arena from another tab." });
      previous.disconnect(true);
    }
    sockets.set(playerId, socket);
    const typed = socket as unknown as {
      on: <K extends keyof ArenaClientEvents>(event: K, handler: ArenaClientEvents[K]) => void;
    };

    // Re-attach to an existing seat after a reconnect.
    const existing = director.roomOf(playerId);
    if (existing) {
      const member = existing.member(playerId);
      if (member) {
        const result = existing.join(playerId, member.name, member.nextHero);
        if (result.ok) {
          socket.join(existing.id);
          typedEmit(socket, "welcome", existing.welcome(playerId));
          existing.flushRoster();
        }
      }
    }

    typed.on("join", (raw, ack) => {
      if (typeof ack !== "function") return;
      const reply = (r: JoinReply) => ack(r);
      if (!data.join.take()) return reply({ ok: false, error: "Slow down a little and try again." });
      const parsed = joinSchema.safeParse(raw);
      if (!parsed.success) return reply({ ok: false, error: "Check your name and hero and try again." });
      const { name, hero, mode, code } = parsed.data;
      const heroId = hero as (typeof HERO_IDS)[number];
      const before = director.roomOf(playerId);
      const placed = mode === "create" ? director.createPrivate(playerId, name, heroId)
        : mode === "code" ? (code ? director.joinCode(playerId, code, name, heroId) : { ok: false as const, error: "Enter a room code." })
          : director.quickPlay(playerId, name, heroId);
      if (!placed.ok) return reply(placed);
      if (before && before.id !== placed.room.id) socket.leave(before.id);
      socket.join(placed.room.id);
      const welcome = placed.room.welcome(playerId)!;
      reply({ ok: true, ...welcome });
      placed.room.flushRoster();
    });

    typed.on("cmd", (payload) => {
      if (!data.cmd.take()) return;
      const cmd = decodeCmd(payload);
      if (!cmd) return;
      director.roomOf(playerId)?.pushCmd(playerId, cmd);
    });

    typed.on("hero", (raw) => {
      if (!data.hero.take()) return;
      const parsed = heroSchema.safeParse(raw);
      if (!parsed.success) return;
      director.roomOf(playerId)?.setHero(playerId, parsed.data.hero as (typeof HERO_IDS)[number]);
    });

    typed.on("leave", () => {
      const room = director.roomOf(playerId);
      if (room) socket.leave(room.id);
      director.leave(playerId);
      room?.flushRoster();
    });

    typed.on("ping", (ack) => { if (typeof ack === "function") ack(); });

    socket.on("disconnect", () => {
      if (sockets.get(playerId)?.id !== socket.id) return;
      sockets.delete(playerId);
      director.disconnect(playerId);
    });
  });

  let timer: NodeJS.Timeout | undefined;
  let closed = false;
  if (opts.autoTick !== false) {
    let next = performance.now();
    const loop = () => {
      if (closed) return;
      const now = performance.now();
      let steps = 0;
      while (next <= now && steps < 3) {
        director.tick();
        next += TICK_MS;
        steps += 1;
      }
      if (next < now - 250) next = now; // we fell far behind; skip instead of spiralling
      timer = setTimeout(loop, Math.max(1, next - performance.now()));
    };
    timer = setTimeout(loop, TICK_MS);
  }

  return {
    director,
    stats: () => ({ ...director.stats(), sockets: sockets.size }),
    close() {
      closed = true;
      if (timer) clearTimeout(timer);
    },
  };
}
