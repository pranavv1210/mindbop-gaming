import test from "node:test";
import assert from "node:assert/strict";
import {
  CMD_SIZE, OWN_BLOCK_SIZE, decodeCmd, decodeSnapshot, encodeCmd, encodeOwnBlock, encodeSnapshotCommon,
  joinSnapshot, quantizeAxis, quantizePitch, quantizeYaw, FLAG, type Cmd,
} from "../src/arena/codec";
import { BODY_HEIGHT, DT, HEROES, JUMP_SPEED, RADIUS, TICK_MS, WEAPONS } from "../src/arena/config";
import { rayAabb, rayCylinderY, raySphere, rayWorld, wrapAngle } from "../src/arena/geometry";
import { MAP_IDS, getMap } from "../src/arena/maps";
import { fitsAt, newBody, stepTick, type MoveInput } from "../src/arena/physics";
import { openMap, solid } from "./arena-helpers";

const input = (p: Partial<MoveInput> = {}): MoveInput => ({ mx: 0, mz: 0, yaw: 0, jump: false, sprint: false, ads: false, dash: false, ...p });
const run = (b: ReturnType<typeof newBody>, i: MoveInput, ticks: number, map = openMap(), speed = 8) => {
  for (let k = 0; k < ticks; k++) stepTick(b, i, speed, map);
};

test("command codec round-trips and rejects malformed input", () => {
  const cmd: Cmd = {
    seq: 4_000_000_001, mx: quantizeAxis(0.5), mz: quantizeAxis(-1), yaw: quantizeYaw(2.2), pitch: quantizePitch(-0.7),
    buttons: 0b101101, weaponSel: 2, viewTick: 123456, viewFrac: 200,
  };
  const bytes = encodeCmd(cmd);
  assert.equal(bytes.length, CMD_SIZE);
  const back = decodeCmd(bytes)!;
  assert.deepEqual(back, cmd);
  assert.equal(decodeCmd(new Uint8Array(CMD_SIZE - 1)), null);
  assert.equal(decodeCmd("hello"), null);
  assert.equal(decodeCmd(null), null);
  assert.equal(decodeCmd({ length: CMD_SIZE }), null);
  const bad = Uint8Array.from(bytes);
  bad[4] = 0x80; // -128 is never produced by the encoder
  assert.equal(decodeCmd(bad), null);
});

test("quantisation is idempotent so client prediction matches the server exactly", () => {
  for (const v of [0, 0.1, 1.23456, -3.9, 6.2831, 100.5]) {
    const q = quantizeYaw(v);
    assert.equal(quantizeYaw(q), q);
  }
  for (const v of [0, 0.3, -1.49, 5]) {
    const q = quantizePitch(v);
    assert.equal(quantizePitch(q), q);
    assert.ok(Math.abs(q) <= 1.5 + 1e-9);
  }
  assert.equal(quantizeAxis(2), 1);
  assert.equal(quantizeAxis(-2), -1);
});

test("snapshots round-trip, include the private block, and reject truncation", () => {
  const players = [
    { slot: 3, gen: 9, x: 12.34, y: 1.5, z: -7.89, yaw: 1.2, pitch: -0.3, hp: 87, flags: FLAG.alive | FLAG.grounded, weapon: 2 },
    { slot: 0, gen: 1, x: -26, y: 0, z: 4.5, yaw: 5, pitch: 0.9, hp: 0, flags: 0, weapon: 0 },
  ];
  const shots = [{ shooter: 3, weapon: 2, x: 20.5, y: 1.2, z: -3.3 }];
  const common = encodeSnapshotCommon(99, 2, 300, 3, [4, 7], players, shots);
  const own = encodeOwnBlock({
    ackSeq: 55, x: 1.5, y: 2.5, z: -3.5, vx: 4, vy: -1, vz: 0.5, grounded: true, lock: 3, weapon: 1, hero: 2,
    ammo: [30, 5, 2, 40], reloadMs: 900, abilityMs: 4000, respawnMs: 0,
  });
  assert.equal(own.length, OWN_BLOCK_SIZE);
  const snap = decodeSnapshot(joinSnapshot(common, own))!;
  assert.equal(snap.tick, 99);
  assert.equal(snap.phase, 2);
  assert.equal(snap.timeLeftDs, 100);
  assert.deepEqual(snap.scores, [4, 7]);
  assert.equal(snap.players.length, 2);
  assert.equal(snap.players[0].slot, 3);
  assert.equal(snap.players[0].gen, 9);
  assert.ok(Math.abs(snap.players[0].x - 12.34) < 0.011);
  assert.ok(Math.abs(snap.players[0].yaw - 1.2) < 0.001);
  assert.equal(snap.players[1].hp, 0);
  assert.equal(snap.shots[0].shooter, 3);
  assert.ok(Math.abs(snap.shots[0].x - 20.5) < 0.011);
  assert.equal(snap.own?.ackSeq, 55);
  assert.deepEqual(snap.own?.ammo, [30, 5, 2, 40]);
  assert.equal(snap.own?.reloadMs, 900);
  assert.equal(snap.own?.hero, 2);
  assert.equal(snap.own?.grounded, true);

  const spectator = decodeSnapshot(joinSnapshot(common, null))!;
  assert.equal(spectator.own, null);
  const whole = joinSnapshot(common, own);
  assert.equal(decodeSnapshot(whole.subarray(0, 12)), null);
  assert.equal(decodeSnapshot(whole.subarray(0, common.length - 3)), null);
  assert.equal(decodeSnapshot(new Uint8Array([9, 0, 0])), null);
});

test("every map is well formed, symmetric and fair", () => {
  for (const id of MAP_IDS) {
    const map = getMap(id);
    assert.ok(map.solids.length > 10, `${id} should have real cover`);
    const ids = new Set(map.solids.map((s) => s.id));
    assert.equal(ids.size, map.solids.length, `${id} solid ids must be unique`);
    for (const s of map.solids) {
      assert.ok(s.minX < s.maxX && s.minY < s.maxY && s.minZ < s.maxZ, `${id}/${s.id} has an empty volume`);
    }
    // Mirror symmetry in x for fairness (outer walls aside).
    const inner = map.solids.filter((s) => s.kind !== "wall");
    for (const s of inner) {
      const twin = inner.find((o) => Math.abs(o.minX + s.maxX) < 1e-9 && Math.abs(o.maxX + s.minX) < 1e-9 && Math.abs(o.minZ - s.minZ) < 1e-9 && Math.abs(o.maxZ - s.maxZ) < 1e-9 && Math.abs(o.minY - s.minY) < 1e-9 && Math.abs(o.maxY - s.maxY) < 1e-9);
      assert.ok(twin, `${id}/${s.id} has no mirror twin`);
    }
    assert.equal(map.spawns[0].length, map.spawns[1].length);
    assert.ok(map.spawns[0].length >= 6);
    for (const team of [0, 1] as const) {
      for (const sp of map.spawns[team]) {
        assert.ok(sp.x > map.bounds.minX + 1 && sp.x < map.bounds.maxX - 1 && sp.z > map.bounds.minZ + 1 && sp.z < map.bounds.maxZ - 1);
        assert.ok(fitsAt(map, sp.x, 0, sp.z), `${id} spawn (${sp.x},${sp.z}) overlaps a solid`);
        // enough clearance that a dash on spawn cannot start inside geometry
        assert.ok(fitsAt(map, sp.x + 1.5 * Math.sign(-sp.x), 0, sp.z), `${id} spawn (${sp.x},${sp.z}) has no forward room`);
      }
    }
  }
});

test("every map is connected: each spawn can walk to every enemy spawn at ground level", () => {
  for (const id of MAP_IDS) {
    const map = getMap(id);
    const cell = 0.5;
    const nx = Math.round((map.bounds.maxX - map.bounds.minX) / cell);
    const nz = Math.round((map.bounds.maxZ - map.bounds.minZ) / cell);
    const blocked = new Uint8Array(nx * nz);
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const x = map.bounds.minX + (i + 0.5) * cell, z = map.bounds.minZ + (j + 0.5) * cell;
        // Ground-level walkability: anything taller than a step blocks (steps are climbable).
        blocked[i * nz + j] = map.solids.some((s) => s.minY < BODY_HEIGHT && s.maxY > 0.6 && x + RADIUS > s.minX && x - RADIUS < s.maxX && z + RADIUS > s.minZ && z - RADIUS < s.maxZ) ? 1 : 0;
      }
    }
    const cellOf = (x: number, z: number) => [Math.floor((x - map.bounds.minX) / cell), Math.floor((z - map.bounds.minZ) / cell)] as const;
    const [sx, sz] = cellOf(map.spawns[0][0].x, map.spawns[0][0].z);
    const seen = new Uint8Array(nx * nz);
    const queue = [sx * nz + sz];
    seen[sx * nz + sz] = 1;
    while (queue.length) {
      const cur = queue.pop()!;
      const ci = Math.floor(cur / nz), cj = cur % nz;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = ci + di, nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= nx || nj >= nz) continue;
        const k = ni * nz + nj;
        if (seen[k] || blocked[k]) continue;
        seen[k] = 1; queue.push(k);
      }
    }
    for (const sp of [...map.spawns[0], ...map.spawns[1]]) {
      const [i, j] = cellOf(sp.x, sp.z);
      assert.equal(seen[i * nz + j], 1, `${id}: spawn (${sp.x}, ${sp.z}) is not reachable from the first ember spawn`);
    }
  }
});

test("gravity lands a falling body and a jump reaches a sensible apex", () => {
  const b = newBody(0, 5, 0);
  b.grounded = false;
  run(b, input(), 40);
  assert.equal(b.y, 0);
  assert.equal(b.grounded, true);
  run(b, input({ jump: true }), 1);
  let apex = 0;
  for (let i = 0; i < 40; i++) { stepTick(b, input(), 8, openMap()); apex = Math.max(apex, b.y); }
  const ideal = (JUMP_SPEED * JUMP_SPEED) / (2 * 24);
  assert.ok(apex > ideal - 0.15 && apex < ideal + 0.05, `apex ${apex} vs ideal ${ideal}`);
  assert.equal(b.y, 0);
});

test("walls stop movement, low cover can be climbed, tall cover cannot", () => {
  const wall = openMap([solid("wall", 5, 6, 0, 3, -20, 20)]);
  const a = newBody(0, 0, 0);
  run(a, input({ mz: 1, yaw: Math.PI / 2 }), 60, wall);
  assert.ok(a.x <= 5 - RADIUS + 1e-6 && a.x > 4, `stopped at ${a.x}`);

  const step = openMap([solid("step", 3, 20, 0, 0.5, -20, 20)]);
  const c = newBody(0, 0, 0);
  run(c, input({ mz: 1, yaw: Math.PI / 2 }), 45, step);
  assert.equal(c.y, 0.5, "should climb a 0.5 m step without jumping");

  const crate = openMap([solid("crate", 3, 20, 0, 1.0, -20, 20)]);
  const d = newBody(0, 0, 0);
  run(d, input({ mz: 1, yaw: Math.PI / 2 }), 30, crate);
  assert.ok(d.x <= 3 - RADIUS + 1e-6, "cannot walk through a 1 m crate");
  const e = newBody(-6, 0, 0);
  let jumped = false;
  for (let i = 0; i < 55; i++) {
    const j = !jumped && e.x >= -0.2;
    if (j) jumped = true;
    stepTick(e, input({ mz: 1, yaw: Math.PI / 2, jump: j }), 8, crate);
  }
  assert.equal(e.y, 1.0, "a jump clears a 1 m crate");
  assert.ok(e.x > 3);

  const tall = openMap([solid("tall", 3, 20, 0, 2.4, -20, 20)]);
  const f = newBody(0, 0, 0);
  for (let i = 0; i < 60; i++) stepTick(f, input({ mz: 1, yaw: Math.PI / 2, jump: i % 5 === 0 && i < 50 }), 8, tall);
  assert.ok(f.x <= 3 - RADIUS + 1e-6 && f.y === 0, "a 2.4 m crate blocks even jumpers");
});

test("ceilings stop upward motion and bodies fall off ledges", () => {
  const low = openMap([solid("slab", -20, 20, 2.0, 2.4, -20, 20)]);
  const b = newBody(0, 0, 0);
  let top = 0;
  stepTick(b, input({ jump: true }), 8, low);
  for (let i = 0; i < 30; i++) { stepTick(b, input(), 8, low); top = Math.max(top, b.y); }
  assert.ok(top <= 2.0 - BODY_HEIGHT + 1e-6, `head must not enter the slab, got ${top}`);

  const ledge = openMap([solid("ledge", -2, 2, 0, 1.0, -2, 2)]);
  const c = newBody(0, 1.0, 0);
  run(c, input({ mz: 1, yaw: Math.PI / 2 }), 40, ledge);
  assert.equal(c.y, 0);
  assert.ok(c.x > 2);
});

test("movement is deterministic and bounded by hero speed, with sprint and dash", () => {
  const seq = (i: number) => input({ mx: i % 7 < 3 ? 1 : 0, mz: i % 11 < 6 ? 1 : -0.5, yaw: i * 0.05, jump: i % 23 === 0, sprint: i % 9 < 4 });
  const a = newBody(1, 0, 1), b = newBody(1, 0, 1);
  const map = getMap("foundry");
  for (let i = 0; i < 400; i++) { stepTick(a, seq(i), 8.4, map); stepTick(b, seq(i), 8.4, map); }
  assert.deepEqual(a, b);

  const walk = newBody(0, 0, 0), sprint = newBody(0, 0, 0);
  run(walk, input({ mz: 1, yaw: Math.PI / 2 }), 30, openMap(), 8);
  run(sprint, input({ mz: 1, yaw: Math.PI / 2, sprint: true }), 30, openMap(), 8);
  assert.ok(sprint.x > walk.x * 1.15);
  assert.ok(walk.x < 8 * 1.0 + 0.01, "cannot exceed speed * time");

  const dash = newBody(0, 0, 0);
  stepTick(dash, input({ dash: true, yaw: Math.PI / 2 }), 8, openMap());
  assert.ok(dash.vx > 20);
  run(dash, input(), 6, openMap());
  assert.ok(dash.x > 3, `dash should carry ${dash.x}`);
  const bounded = newBody(29, 0, 0);
  run(bounded, input({ mz: 1, yaw: Math.PI / 2 }), 60, openMap());
  assert.ok(bounded.x <= 30 - RADIUS + 1e-9);
  assert.equal(HEROES.ghost.speed > HEROES.warden.speed, true);
  assert.ok(DT > 0 && TICK_MS > 30 && TICK_MS < 40);
});

test("ray helpers hit what they should and miss what they should", () => {
  const s = solid("b", 4, 6, 0, 2, -1, 1);
  assert.ok(Math.abs(rayAabb(0, 1, 0, 1, 0, 0, s, 100) - 4) < 1e-9);
  assert.equal(rayAabb(0, 1, 0, -1, 0, 0, s, 100), Infinity);
  assert.equal(rayAabb(0, 3, 0, 1, 0, 0, s, 100), Infinity);
  assert.equal(rayAabb(0, 1, 0, 1, 0, 0, s, 3), Infinity);
  assert.ok(Math.abs(rayWorld(openMap([s]), 0, 1, 0, 1, 0, 0, 50) - 4) < 1e-9);

  assert.ok(Math.abs(raySphere(0, 0, 0, 1, 0, 0, 5, 0, 0, 1, 50) - 4) < 1e-9);
  assert.equal(raySphere(0, 0, 0, 1, 0, 0, 5, 2, 0, 1, 50), Infinity);
  assert.equal(raySphere(0, 0, 0, 1, 0, 0, 5, 0, 0, 1, 3), Infinity);

  assert.ok(Math.abs(rayCylinderY(0, 1, 0, 1, 0, 0, 5, 0, 0.5, 0, 1.4, 50) - 4.5) < 1e-9);
  assert.equal(rayCylinderY(0, 2, 0, 1, 0, 0, 5, 0, 0.5, 0, 1.4, 50), Infinity);
  assert.equal(rayCylinderY(0, 1, 2, 1, 0, 0, 5, 0, 0.5, 0, 1.4, 50), Infinity);
  assert.equal(rayCylinderY(0, 1, 0, 0, 1, 0, 5, 0, 0.5, 0, 1.4, 50), Infinity);
  assert.ok(Math.abs(wrapAngle(Math.PI * 3) - Math.PI) < 1e-9 || Math.abs(wrapAngle(Math.PI * 3) + Math.PI) < 1e-9);
});

test("weapon table is internally consistent", () => {
  const indexes = Object.values(WEAPONS).map((w) => w.index).sort();
  assert.deepEqual(indexes, [0, 1, 2, 3]);
  for (const w of Object.values(WEAPONS)) {
    assert.ok(w.damage > 0 && w.mag > 0 && w.reloadMs > 0 && w.intervalMs >= 50 && w.range > 0 && w.pellets >= 1);
    assert.ok(w.falloffMin > 0 && w.falloffMin <= 1);
  }
  const heroIndexes = Object.values(HEROES).map((h) => h.index).sort();
  assert.deepEqual(heroIndexes, [0, 1, 2, 3]);
});
