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
          const session = engine.session(tokenFrom(req));
          res.setHeader(
            "Set-Cookie",
            `mindbop_session=${session.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${!dev && origin.startsWith("https:") ? "; Secure" : ""}`,
          );
          return json(200, { id: session.id });
        } catch {
          return json(503, { error: "The server is busy. Try again shortly." });
        }
      }
      const configured = Boolean(
        process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
      );
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
        const response = await fetch(
          `${process.env.SUPABASE_URL}/rest/v1/feedback`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              Prefer: "return=minimal",
            },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(8000),
          },
        );
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
      ack(result);
      broadcast();
    });
    socket.on("disconnect", () => {
      engine.disconnect(s, socket.id);
      last.delete(socket.id);
      broadcast();
    });
  });
  const tick = setInterval(() => {
    engine.tick();
    broadcast();
  }, 250);
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
