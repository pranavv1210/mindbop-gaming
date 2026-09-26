import { createServer, type IncomingMessage } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { loadEnvConfig } from "@next/env";
import { z } from "zod";
import { Engine } from "./engine";
import type { ClientEvents, ServerEvents } from "../src/lib/protocol";

loadEnvConfig(process.cwd());
const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const origin = process.env.APP_ORIGIN ?? `http://localhost:${port}`;
const app = next({ dev, hostname: "0.0.0.0", port });
const engine = new Engine();
const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabasePublic =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? supabaseSecret;
async function authUser(req: IncomingMessage) {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!bearer || !supabaseUrl || !supabasePublic) return null;
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabasePublic, Authorization: `Bearer ${bearer}` },
  });
  if (!response.ok) return null;
  return (await response.json()) as { id: string };
}
async function restoreRooms() {
  if (!supabaseUrl || !supabaseSecret) return;
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rooms?select=code,state&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`,
    {
      headers: {
        apikey: supabaseSecret,
        Authorization: `Bearer ${supabaseSecret}`,
      },
    },
  );
  if (response.ok) engine.restoreRooms(await response.json());
}
let saveTimer: NodeJS.Timeout | undefined;
const recordedMatches = new Set<string>();
async function recordCompletedMatches() {
  if (!supabaseUrl || !supabaseSecret) return;
  for (const snapshot of engine.roomSnapshots()) {
    if (snapshot.phase !== "completed") continue;
    const room = snapshot.state as unknown as {
      players: Array<{ id: string }>;
      state: {
        runId?: string;
        winner?: string | null;
        winnerIds?: string[];
        draw?: boolean;
        scores?: Record<string, number>;
      };
    };
    const game = room.state;
    if (!game?.runId || recordedMatches.has(game.runId)) continue;
    recordedMatches.add(game.runId);
    const winners = new Set(
      game.winnerIds ?? (game.winner ? [game.winner] : []),
    );
    const results = room.players.map((player) => ({
      profile_id: player.id,
      result: game.draw
        ? "draw"
        : winners.has(player.id)
          ? "win"
          : winners.size
            ? "loss"
            : "finished",
      score: game.scores?.[player.id] ?? 0,
    }));
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/record_match_result`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseSecret,
          Authorization: `Bearer ${supabaseSecret}`,
        },
        body: JSON.stringify({
          p_match_id: game.runId,
          p_game_id: snapshot.gameId,
          p_room_code: snapshot.code,
          p_results: results,
          p_state: game,
        }),
      },
    );
    if (!response.ok) recordedMatches.delete(game.runId);
  }
}
function persistRooms() {
  if (!supabaseUrl || !supabaseSecret) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const snapshots = engine.roomSnapshots().map((r) => ({
      code: r.code,
      game_id: r.gameId,
      host_user_id: r.hostId,
      phase: r.phase,
      state: r.state,
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    }));
    if (!snapshots.length) return;
    await fetch(`${supabaseUrl}/rest/v1/rooms?on_conflict=code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseSecret,
        Authorization: `Bearer ${supabaseSecret}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(snapshots),
    });
    await recordCompletedMatches();
  }, 150);
}
const tokenFrom = (req: IncomingMessage) =>
  req.headers.cookie
    ?.split("; ")
    .find((c) => c.startsWith("mindbop_session="))
    ?.split("=")[1];
const feedbackSchema = z.object({
  category: z.enum(["New game", "Bug report", "Improvement", "Just saying hi"]),
  message: z.string().trim().min(10).max(2000),
  name: z.string().trim().max(24),
  email: z.union([z.literal(""), z.email().max(254)]),
  website: z.literal(""),
});
const attempts = new Map<string, number[]>();
function limited(key: string, count: number) {
  const times = (attempts.get(key) ?? []).filter((t) => Date.now() - t < 60000);
  if (times.length >= count) return true;
  times.push(Date.now());
  attempts.set(key, times);
  return times.length > count;
}
async function main() {
  await restoreRooms();
  await app.prepare();
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url ?? "/", origin).pathname;
    const json = (status: number, body: unknown) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(JSON.stringify(body));
    };
    if (pathname === "/api/health")
      return json(200, {
        status: "ok",
        rooms: engine.rooms.size,
        connectedPlayers: [...engine.sessions.values()].filter(
          (s) => s.sockets.size,
        ).length,
      });
    if (pathname === "/api/session" || pathname === "/api/feedback") {
      if (req.method === "POST" && req.headers.origin !== origin)
        return json(403, { error: "Request origin is not allowed." });
      if (pathname === "/api/session") {
        if (req.method !== "POST") return json(405, { error: "Use POST." });
        if (limited(`session:${req.socket.remoteAddress}`, 60))
          return json(429, { error: "Too many requests. Wait a minute." });
        try {
          const user = await authUser(req);
          const session = engine.session(tokenFrom(req), user?.id);
          res.setHeader(
            "Set-Cookie",
            `mindbop_session=${session.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${!dev && origin.startsWith("https:") ? "; Secure" : ""}`,
          );
          return json(200, { id: session.id });
        } catch {
          return json(503, { error: "The server is busy. Try again shortly." });
        }
      }
      const configured = Boolean(supabaseUrl && supabaseSecret);
      if (req.method === "GET") return json(200, { available: configured });
      if (req.method !== "POST") return json(405, { error: "Use POST." });
      if (!configured)
        return json(503, {
          error:
            "Feedback delivery is not available yet. Please try again later.",
        });
      if (limited(`feedback:${req.socket.remoteAddress}`, 5))
        return json(429, {
          error: "You’ve sent a few messages. Please wait a minute.",
        });
      try {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 12000)
            return json(413, { error: "Your message is too long." });
        }
        const input = feedbackSchema.safeParse(JSON.parse(body));
        if (!input.success)
          return json(400, {
            error:
              "Add a message of 10–2,000 characters and check your email address.",
          });
        const { category, message, name, email } = input.data;
        const data = { category, message, name, email };
        const response = await fetch(`${supabaseUrl}/rest/v1/feedback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseSecret!,
            Authorization: `Bearer ${supabaseSecret}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error("Storage unavailable");
        return json(201, { received: true });
      } catch {
        return json(502, {
          error: "Your feedback wasn’t delivered. Please try again.",
        });
      }
    }
    try {
      await app.getRequestHandler()(req, res);
    } catch {
      if (!res.headersSent)
        json(500, { error: "Something went wrong. Please try again." });
      else res.end();
    }
  });
  const io = new Server<ClientEvents, ServerEvents>(server, {
    maxHttpBufferSize: 16000,
    cors: { origin, credentials: true },
    allowRequest: (req, cb) =>
      cb(null, !req.headers.origin || req.headers.origin === origin),
  });
  io.use((socket, done) => {
    const token = tokenFrom(socket.request);
    if (!token || !engine.sessions.has(token))
      return done(new Error("Session expired. Refresh to reconnect."));
    done();
  });
  const last = new Map<string, string>();
  function broadcast() {
    for (const socket of io.sockets.sockets.values()) {
      const session = engine.sessions.get(tokenFrom(socket.request)!);
      if (!session) continue;
      const view = engine.view(session);
      const comparable = JSON.stringify(
        view ? { ...view, serverTime: 0 } : null,
      );
      if (last.get(socket.id) !== comparable) {
        socket.emit("room:state", view);
        last.set(socket.id, comparable);
      }
    }
  }
  io.on("connection", (socket) => {
    const s = engine.sessions.get(tokenFrom(socket.request)!)!;
    engine.connect(s, socket.id);
    socket.emit("session", { id: s.id });
    broadcast();
    socket.on("command", (input, ack) => {
      if (typeof ack !== "function") return;
      const result = engine.command(s, input);
      engine.tick();
      persistRooms();
      ack(result);
      broadcast();
    });
    socket.on("move", (input) => engine.move(s, input));
    socket.on("disconnect", () => {
      engine.disconnect(s, socket.id);
      persistRooms();
      last.delete(socket.id);
      broadcast();
    });
  });
  let frame = 0;
  const tick = setInterval(() => {
    engine.tick();
    if (++frame % 2 === 0) broadcast();
  }, 50);
  const cleanup = setInterval(() => {
    for (const [key, times] of attempts)
      if (Date.now() - times[times.length - 1] > 60000) attempts.delete(key);
  }, 60000);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => {
      server.off("error", reject);
      console.log(`MindBop is ready at ${origin}`);
      resolve();
    });
  });
  const shutdown = () => {
    clearInterval(tick);
    clearInterval(cleanup);
    io.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
