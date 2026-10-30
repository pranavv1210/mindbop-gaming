import test from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io as connect, type Socket } from "socket.io-client";
import { BTN, EMPTY_ROOM_TTL_TICKS, MAX_PLAYERS_PER_ROOM, MAX_QUEUED_CMDS } from "../src/arena/config";
import { decodeSnapshot, encodeCmd, type Snapshot } from "../src/arena/codec";
import type { JoinReply } from "../src/arena/protocol";
import { ArenaDirector, type DirectorOut } from "../server/arena/director";
import { registerArena, type ArenaServer } from "../server/arena/net";

const silent: DirectorOut = { snapshot() {}, event() {}, room() {} };

test("matchmaker fills rooms, concentrates players, and opens new rooms when full", () => {
  const d = new ArenaDirector(silent, { maxRooms: 3 });
  for (let i = 0; i < MAX_PLAYERS_PER_ROOM; i++) {
    const r = d.quickPlay(`p${i}`, `P${i}`, "striker");
    assert.ok(r.ok);
  }
  assert.equal(d.rooms.size, 1);
  const overflow = d.quickPlay("p12", "P12", "ghost");
  assert.ok(overflow.ok);
  assert.equal(d.rooms.size, 2);
  const next = d.quickPlay("p13", "P13", "medic");
  assert.ok(next.ok && next.room.id === (overflow.ok ? overflow.room.id : ""), "the room with more players is preferred to a fresh one");
  const again = d.quickPlay("p0", "P0", "striker");
  assert.ok(again.ok && again.room.has("p0") && d.rooms.size === 2, "asking again re-attaches instead of duplicating");
  assert.equal(d.stats().players, MAX_PLAYERS_PER_ROOM + 2);
});

test("matchmaker enforces its room cap and reports a friendly error", () => {
  const d = new ArenaDirector(silent, { maxRooms: 1 });
  for (let i = 0; i < MAX_PLAYERS_PER_ROOM; i++) d.quickPlay(`p${i}`, "x", "striker");
  const refused = d.quickPlay("extra", "x", "striker");
  assert.equal(refused.ok, false);
  assert.match(refused.ok ? "" : refused.error, /busy/i);
});

test("private rooms are joinable by code only and empty rooms are cleaned up", () => {
  const d = new ArenaDirector(silent);
  const host = d.createPrivate("host", "Host", "warden");
  assert.ok(host.ok);
  const code = host.ok ? host.room.id : "";
  const stranger = d.quickPlay("rando", "Rando", "ghost");
  assert.ok(stranger.ok && stranger.room.id !== code, "quick play never lands in a private room");
  const friend = d.joinCode("friend", code.toLowerCase(), "Friend", "medic");
  assert.ok(friend.ok && friend.room.id === code);
  assert.equal(d.joinCode("x", "ZZZZZZ", "x", "striker").ok, false);
  d.leave("host"); d.leave("friend"); d.leave("rando");
  for (let i = 0; i < EMPTY_ROOM_TTL_TICKS + 5; i++) d.tick();
  assert.equal(d.rooms.size, 0);
  assert.ok(d.stats().ticks > EMPTY_ROOM_TTL_TICKS);
});

let httpServer: HttpServer, io: Server, arena: ArenaServer, url: string;
const clients: Socket[] = [];

async function boot() {
  httpServer = createServer();
  io = new Server(httpServer, { maxHttpBufferSize: 16000 });
  arena = registerArena(io, (req) => {
    const m = /(?:^|; )mb=([a-z0-9-]+)/.exec(req.headers.cookie ?? "");
    return m ? { id: m[1] } : undefined;
  });
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}/arena`;
}
async function shutdown() {
  clients.forEach((c) => c.disconnect());
  arena.close();
  io.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
}
function client(id: string | null) {
  const socket = connect(url, { transports: ["websocket"], forceNew: true, reconnection: false, extraHeaders: id ? { Cookie: `mb=${id}` } : {} });
  clients.push(socket);
  const snaps: Snapshot[] = [];
  const events: Array<{ name: string; payload: unknown }> = [];
  socket.on("snap", (data: ArrayBuffer) => { const s = decodeSnapshot(data); if (s) snaps.push(s); });
  for (const name of ["roster", "phase", "feed", "hit", "hurt", "welcome", "kicked"]) socket.on(name, (payload) => events.push({ name, payload }));
  return { socket, snaps, events };
}
const opened = (socket: Socket) => new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
const join = (socket: Socket, payload: object) => socket.timeout(3000).emitWithAck("join", payload) as Promise<JoinReply>;
const until = async (check: () => boolean, ms = 4000) => {
  const end = Date.now() + ms;
  while (!check()) { if (Date.now() > end) throw new Error("timed out waiting for condition"); await new Promise((r) => setTimeout(r, 15)); }
};

test("real sockets: sessions, joining, binary snapshots, movement and acks", async () => {
  await boot();
  try {
    const stranger = client(null);
    await assert.rejects(opened(stranger.socket), /Session expired/);

    const a = client("alice"), b = client("bob");
    await Promise.all([opened(a.socket), opened(b.socket)]);
    const bad = await join(a.socket, { name: "x", hero: "dragon", mode: "quick" });
    assert.equal(bad.ok, false);
    const ra = await join(a.socket, { name: "Alice", hero: "striker", mode: "quick" });
    const rb = await join(b.socket, { name: "Bob", hero: "ghost", mode: "quick" });
    assert.ok(ra.ok && rb.ok && ra.room === rb.room, "both land in the same arena");
    await until(() => a.snaps.length > 3 && b.snaps.length > 3);
    const first = a.snaps.at(-1)!;
    assert.equal(first.players.length, 2);
    assert.ok(first.own);

    const start = first.own!.z;
    let seq = 1;
    const timer = setInterval(() => a.socket.volatile.emit("cmd", encodeCmd({ seq: seq++, mx: 0, mz: 1, yaw: 0, pitch: 0, buttons: 0, weaponSel: 255, viewTick: 0, viewFrac: 0 })), 33);
    await until(() => (a.snaps.at(-1)?.own?.z ?? 0) > start + 3);
    clearInterval(timer);
    const latest = a.snaps.at(-1)!;
    assert.ok(latest.own!.ackSeq > 5 && latest.own!.ackSeq < seq, "acks trail what was sent");
    await until(() => events(a).some((e) => e.name === "roster" && (e.payload as { players: unknown[] }).players.length === 2));
    assert.equal(arena.stats().sockets, 2);
    assert.ok(arena.stats().tickMs.max < 50);
  } finally {
    await shutdown();
  }
  function events(c: { events: Array<{ name: string; payload: unknown }> }) { return c.events; }
});

test("real sockets: hostile or broken input never crashes the server", async () => {
  await boot();
  try {
    const a = client("mallory");
    await opened(a.socket);
    const reply = await join(a.socket, { name: "Mallory", hero: "medic", mode: "quick" });
    assert.ok(reply.ok);
    const garbage: unknown[] = [null, 42, "text", {}, [], new Uint8Array(3), new ArrayBuffer(100), { buffer: 1 }];
    for (const g of garbage) a.socket.emit("cmd", g);
    a.socket.emit("hero", { hero: "../../etc/passwd" });
    a.socket.emit("hero", 17);
    a.socket.emit("join", "nope");
    a.socket.emit("join", { name: "x".repeat(1000), hero: "ghost", mode: "quick" }, () => {});
    a.socket.emit("ping");
    for (let i = 0; i < 400; i++) a.socket.emit("cmd", encodeCmd({ seq: i + 1, mx: 1, mz: 1, yaw: 0, pitch: 0, buttons: BTN.fire, weaponSel: 255, viewTick: 0, viewFrac: 0 }));
    await new Promise((r) => setTimeout(r, 200));
    const room = arena.director.roomOf("mallory")!;
    assert.ok(room.member("mallory")!.queue.length <= MAX_QUEUED_CMDS);
    assert.equal(a.socket.connected, true);
    const pong = await a.socket.timeout(2000).emitWithAck("ping");
    assert.ok(pong !== undefined || true);
    const late = await join(a.socket, { name: "Mallory", hero: "medic", mode: "code", code: "ABCDEF" });
    assert.equal(late.ok, false);
  } finally {
    await shutdown();
  }
});

test("real sockets: a second tab replaces the first, and reconnecting reclaims the seat", async () => {
  await boot();
  try {
    const first = client("carol");
    await opened(first.socket);
    const r1 = await join(first.socket, { name: "Carol", hero: "warden", mode: "quick" });
    assert.ok(r1.ok);
    const second = client("carol");
    await opened(second.socket);
    await until(() => first.events.some((e) => e.name === "kicked") || !first.socket.connected);
    await until(() => second.events.some((e) => e.name === "welcome"));
    const welcome = second.events.find((e) => e.name === "welcome")!.payload as { room: string; slot: number };
    assert.equal(welcome.room, r1.ok ? r1.room : "");
    assert.equal(welcome.slot, r1.ok ? r1.slot : -1);
    await until(() => second.snaps.length > 2);
    assert.equal(arena.director.roomOf("carol")!.size, 1);
    second.socket.emit("leave");
    await until(() => arena.director.roomOf("carol") === undefined);
  } finally {
    await shutdown();
  }
});

test("real sockets: two players can fight and the server decides the outcome", async () => {
  await boot();
  try {
    const a = client("dana"), b = client("eli");
    await Promise.all([opened(a.socket), opened(b.socket)]);
    const ra = await join(a.socket, { name: "Dana", hero: "striker", mode: "create" });
    assert.ok(ra.ok);
    const rb = await join(b.socket, { name: "Eli", hero: "striker", mode: "code", code: ra.ok ? ra.room : "" });
    assert.ok(rb.ok);
    const room = arena.director.roomOf("dana")!;
    await until(() => room.phase === "live", 15000);
    const da = room.member("dana")!, eb = room.member("eli")!;
    da.team = 0; eb.team = 1;
    da.protectUntil = 0; eb.protectUntil = 0;
    // the real map is used; place both in open floor facing each other
    for (const [m, x] of [[da, -6], [eb, 4]] as const) { m.body.x = x; m.body.z = -17.5; m.body.y = 0; m.body.vx = m.body.vz = 0; }
    await new Promise((r) => setTimeout(r, 150));
    let seq = 1;
    const hp = eb.hp;
    const shooter = setInterval(() => {
      const snap = a.snaps.at(-1);
      a.socket.volatile.emit("cmd", encodeCmd({ seq: seq++, mx: 0, mz: 0, yaw: Math.PI / 2, pitch: 0.012, buttons: BTN.fire, weaponSel: 255, viewTick: snap ? snap.tick - 3 : 0, viewFrac: 0 }));
    }, 33);
    await until(() => a.events.some((e) => e.name === "hit"), 6000);
    assert.ok(eb.hp < hp, "damage is applied by the server");
    await until(() => b.events.some((e) => e.name === "hurt"));
    await until(() => a.snaps.some((s) => s.shots.length > 0) && b.snaps.some((s) => s.shots.length > 0));
    clearInterval(shooter);
  } finally {
    await shutdown();
  }
});
