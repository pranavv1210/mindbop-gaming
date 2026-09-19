import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { io, type Socket } from "socket.io-client";
import type { Command, Reply, RoomView } from "../src/lib/protocol";

// Run only against an instance you own. Defaults are deliberately small.
const origin = process.env.LOAD_ORIGIN ?? "http://localhost:3000";
const roomCount = Number(process.env.LOAD_ROOMS ?? 8);
if (!Number.isInteger(roomCount) || roomCount < 1 || roomCount > 20)
  throw new Error(
    "LOAD_ROOMS must be between 1 and 20. Raise capacity only after measuring a baseline.",
  );
const clients: {
  socket: Socket;
  room: RoomView | null;
  cookie: string;
  id: string;
}[] = [];
const latency: number[] = [];
let actions = 0;
let errors = 0;
const started = performance.now();
async function connect() {
  const response = await fetch(`${origin}/api/session`, {
    method: "POST",
    headers: { Origin: origin },
  });
  if (!response.ok) throw new Error(`Session failed: ${response.status}`);
  const cookie = response.headers.get("set-cookie")!.split(";")[0];
  const identity = (await response.json()) as { id: string };
  const socket = io(origin, {
    autoConnect: false,
    extraHeaders: { Cookie: cookie, Origin: origin },
    transports: ["websocket"],
  });
  const client = {
    socket,
    room: null as RoomView | null,
    cookie,
    id: identity.id,
  };
  clients.push(client);
  socket.on("room:state", (room: RoomView | null) => {
    client.room = room;
  });
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
    socket.connect();
  });
  return client;
}
async function command(socket: Socket, command: Command) {
  const before = performance.now();
  actions++;
  const result = (await socket
    .timeout(5000)
    .emitWithAck("command", { id: randomUUID(), command })) as Reply;
  latency.push(performance.now() - before);
  if (!result.ok) {
    errors++;
    throw new Error(result.error);
  }
  return result;
}
async function until(check: () => boolean, timeout = 30000) {
  const deadline = performance.now() + timeout;
  while (!check()) {
    if (performance.now() > deadline)
      throw new Error("State transition timed out");
    await new Promise((r) => setTimeout(r, 50));
  }
}
async function main() {
  try {
    const pairs = [];
    for (let i = 0; i < roomCount; i++) {
      const host = await connect();
      const guest = await connect();
      const result = await command(host.socket, {
        type: "create",
        name: `Load host ${i}`,
        avatar: 0,
        gameId: "last-guest",
      });
      await command(guest.socket, {
        type: "join",
        name: `Load guest ${i}`,
        avatar: 1,
        code: result.code!,
      });
      pairs.push({ host, guest });
    }
    const sample = pairs[0].guest;
    sample.socket.disconnect();
    sample.socket.connect();
    await until(() => sample.socket.connected);
    await until(
      () =>
        sample.room?.players.find((p) => p.id === sample.id)?.connected ===
        true,
    );
    await Promise.all(
      pairs.map(async ({ host, guest }) => {
        await command(host.socket, { type: "ready", ready: true });
        await command(guest.socket, { type: "ready", ready: true });
        await command(host.socket, { type: "start" });
        await command(host.socket, { type: "game", action: { type: "begin" } });
        await until(() => guest.room?.game?.phase === "investigation");
        const startX = host.room!.game!.positions[host.id].x;
        for (let i = 0; i < 20; i++) {
          host.socket.emit("move", { x: 1, z: 0 });
          guest.socket.emit("move", { x: 0, z: -1 });
          await new Promise((r) => setTimeout(r, 100));
        }
        host.socket.emit("move", { x: 0, z: 0 });
        guest.socket.emit("move", { x: 0, z: 0 });
        await until(
          () => (guest.room?.game?.positions[host.id].x ?? startX) > startX + 1,
        );
        await command(host.socket, {
          type: "game",
          action: { type: "note", text: "Investigating the hotel." },
        });
        await until(() => guest.room?.game?.notes.length === 1);
        await command(host.socket, { type: "leave" });
        await command(guest.socket, { type: "leave" });
      }),
    );
    latency.sort((a, b) => a - b);
    const elapsed = (performance.now() - started) / 1000;
    console.log(
      JSON.stringify(
        {
          origin,
          rooms: roomCount,
          connectedClients: clients.length,
          connectionSuccessRate: "100%",
          actions,
          errors,
          errorRate: errors / actions,
          durationSeconds: +elapsed.toFixed(2),
          throughputActionsPerSecond: +(actions / elapsed).toFixed(2),
          acknowledgementLatencyMs: {
            median: +latency[Math.floor(latency.length * 0.5)].toFixed(2),
            p95: +latency[Math.floor(latency.length * 0.95)].toFixed(2),
            max: +latency.at(-1)!.toFixed(2),
          },
          checks: [
            "create",
            "join",
            "concurrent rooms",
            "reconnection",
            "server movement and peer synchronization",
            "shared investigation notes",
            "explicit leave cleanup",
          ],
          healthAfter: await fetch(`${origin}/api/health`).then((r) =>
            r.json(),
          ),
        },
        null,
        2,
      ),
    );
  } finally {
    clients.forEach((c) => c.socket.disconnect());
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
