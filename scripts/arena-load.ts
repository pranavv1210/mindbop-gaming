// Load test: N real socket.io bot clients against the real /arena namespace.
// Usage: tsx scripts/arena-load.ts [bots=120] [seconds=20]
// Server and bots share one process/CPU here, so the numbers are pessimistic for the server.
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io as connect, type Socket } from "socket.io-client";
import { BTN } from "../src/arena/config";
import { encodeCmd } from "../src/arena/codec";
import { registerArena } from "../server/arena/net";

const BOTS = Number(process.argv[2] ?? 120);
const SECONDS = Number(process.argv[3] ?? 20);
const HEROES = ["striker", "warden", "ghost", "medic"];

async function main() {
  const http = createServer();
  const io = new Server(http, { maxHttpBufferSize: 16000 });
  const arena = registerArena(io, (req) => {
    const m = /(?:^|; )mb=([a-z0-9-]+)/.exec(req.headers.cookie ?? "");
    return m ? { id: m[1] } : undefined;
  });
  await new Promise<void>((r) => http.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(http.address() as AddressInfo).port}/arena`;

  let bytes = 0, snaps = 0, errors = 0, joined = 0;
  const gaps: number[] = [];
  const sockets: Socket[] = [];
  const timers: NodeJS.Timeout[] = [];

  for (let i = 0; i < BOTS; i++) {
    const s = connect(url, { transports: ["websocket"], forceNew: true, reconnection: false, extraHeaders: { Cookie: `mb=bot${i}` } });
    sockets.push(s);
    let last = 0;
    s.on("snap", (d: ArrayBuffer) => {
      const now = performance.now();
      if (last && i === 0) gaps.push(now - last);
      last = now; bytes += (d as ArrayBuffer).byteLength; snaps++;
    });
    s.on("connect_error", () => errors++);
    s.on("disconnect", () => { /* counted by caller */ });
    s.on("connect", async () => {
      const r = await s.timeout(5000).emitWithAck("join", { name: `Bot${i}`, hero: HEROES[i % 4], mode: "quick" }).catch(() => null);
      if (!r || !r.ok) { errors++; return; }
      joined++;
      let seq = 1, yaw = Math.random() * 6.28, strafe = 0;
      timers.push(setInterval(() => {
        if (Math.random() < 0.05) { yaw += (Math.random() - 0.5) * 2; strafe = Math.floor(Math.random() * 3) - 1; }
        const buttons = (Math.random() < 0.5 ? BTN.fire : 0) | (Math.random() < 0.02 ? BTN.jump : 0);
        s.volatile.emit("cmd", encodeCmd({ seq: seq++ & 0xffff, mx: strafe, mz: 1, yaw, pitch: 0, buttons, weaponSel: 255, viewTick: 0, viewFrac: 0 }));
      }, 1000 / 30));
    });
    if (i % 10 === 9) await new Promise((r) => setTimeout(r, 40));
  }

  await new Promise((r) => setTimeout(r, 3000));
  const startBytes = bytes, startSnaps = snaps, t0 = performance.now();
  await new Promise((r) => setTimeout(r, SECONDS * 1000));
  const secs = (performance.now() - t0) / 1000;
  const st = arena.stats();
  gaps.sort((a, b) => a - b);
  const q = (p: number) => gaps.length ? gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * p))].toFixed(1) : "n/a";
  const report = {
    bots: BOTS, joined, errors, rooms: st.rooms, players: st.players,
    serverTickMs: st.tickMs, slowTicks: st.slowTicks,
    perClientKBps: +(((bytes - startBytes) / secs / BOTS) / 1024).toFixed(2),
    totalMBps: +(((bytes - startBytes) / secs) / 1048576).toFixed(2),
    snapshotsPerClientPerSec: +(((snaps - startSnaps) / secs) / BOTS).toFixed(1),
    snapshotGapMs_bot0: { p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1) },
  };
  console.log(JSON.stringify(report, null, 2));
  timers.forEach(clearInterval); sockets.forEach((s) => s.disconnect()); arena.close(); io.close(); http.close();
  const ok = joined === BOTS && errors === 0 && st.tickMs.p99 < 33;
  console.log(ok ? "PASS" : "FAIL");
  process.exit(ok ? 0 : 1);
}
main();
