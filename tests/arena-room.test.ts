import test from "node:test";
import assert from "node:assert/strict";
import {
  BTN, COUNTDOWN_TICKS, DISCONNECT_GRACE_TICKS, KILL_LIMIT, MATCH_TICKS, MAX_PLAYERS_PER_ROOM, MAX_QUEUED_CMDS,
  RESPAWN_TICKS, SPAWN_PROTECT_TICKS, WEAPONS, HEROES, END_TICKS,
} from "../src/arena/config";
import { FLAG } from "../src/arena/codec";
import { newBody, stepTick, type MoveInput } from "../src/arena/physics";
import { advance, cmd, lastSnapshot, makeRoom, openMap, place, solid } from "./arena-helpers";

const FACE_X = Math.PI / 2;
const BODY_PITCH = 0.07; // aims at the torso from eye height at ~10 m

function duel(extra: { map?: ReturnType<typeof openMap>; heroes?: [string, string] } = {}) {
  const { room, cap } = makeRoom([{ id: "a", hero: (extra.heroes?.[0] ?? "striker") as never }, { id: "b", hero: (extra.heroes?.[1] ?? "striker") as never }], { map: extra.map ?? openMap() });
  const a = room.member("a")!, b = room.member("b")!;
  a.team = 0; b.team = 1;
  place(room, "a", 0, 0, 0); a.yaw = FACE_X;
  place(room, "b", 10, 0, 0);
  advance(room, 2); // let the server record where everyone now stands (lag compensation reads history)
  return { room, cap, a, b };
}
const fire = (room: ReturnType<typeof duel>["room"], id: string, extra: Parameters<typeof cmd>[0] = {}) => {
  room.pushCmd(id, cmd({ yaw: FACE_X, pitch: BODY_PITCH, buttons: BTN.fire, ...extra }));
  room.step();
};

test("rooms assign slots, balance teams, and refuse a 13th player", () => {
  const { room } = makeRoom(Array.from({ length: MAX_PLAYERS_PER_ROOM }, (_, i) => ({ id: `p${i}` })), { live: false });
  const counts = [0, 0];
  for (const m of room.allMembers()) counts[m.team]++;
  assert.deepEqual(counts, [6, 6]);
  assert.equal(new Set([...room.allMembers()].map((m) => m.slot)).size, MAX_PLAYERS_PER_ROOM);
  const extra = room.join("late", "Late", "ghost");
  assert.equal(extra.ok, false);
  assert.equal(room.isFull, true);
  const gen = room.member("p3")!.gen;
  const slot = room.member("p3")!.slot;
  room.leave("p3");
  const again = room.join("fresh", "Fresh", "medic");
  assert.ok(again.ok && again.slot === slot);
  assert.equal(room.member("fresh")!.gen, (gen + 1) & 15, "a reused slot gets a new generation so clients reset interpolation");
});

test("match phases: waiting, countdown, live, ended, next map", () => {
  const { room, cap } = makeRoom([{ id: "a" }, { id: "b" }], { live: false });
  assert.equal(room.phase, "waiting");
  room.step();
  assert.equal(room.phase, "countdown");
  const firstMap = room.mapId;
  advance(room, COUNTDOWN_TICKS);
  assert.equal(room.phase, "live");
  room.scores[0] = KILL_LIMIT;
  room.step();
  assert.equal(room.phase, "ended");
  assert.equal(room.winner, 0);
  assert.ok(cap.events.some((e) => e.name === "phase" && e.payload.phase === "ended" && e.payload.winner === 0));
  advance(room, END_TICKS);
  assert.equal(room.phase, "countdown");
  assert.notEqual(room.mapId, firstMap, "maps rotate between matches");
  assert.deepEqual(room.scores, [0, 0]);
  advance(room, COUNTDOWN_TICKS);
  advance(room, MATCH_TICKS);
  assert.equal(room.phase, "ended", "the clock ends a match");
  room.leave("b");
  advance(room, END_TICKS + 2);
  assert.equal(room.phase, "waiting", "one player cannot run a match");
});

test("a lone player falls back to waiting and combat is off outside a live match", () => {
  const { room } = makeRoom([{ id: "a" }, { id: "b" }], { live: false });
  const a = room.member("a")!, b = room.member("b")!;
  a.team = 0; b.team = 1;
  room.step();
  place(room, "a", 0, 0, 0); place(room, "b", 10, 0, 0);
  room.map = openMap();
  const hp = b.hp;
  fire(room, "a");
  assert.equal(b.hp, hp, "no damage during the countdown");
  advance(room, COUNTDOWN_TICKS);
  room.leave("b");
  room.step();
  assert.equal(room.phase, "waiting");
});

test("server physics equals client prediction for the same commands", () => {
  const { room } = makeRoom([{ id: "a" }, { id: "b" }], { map: openMap() });
  const a = room.member("a")!;
  const local = newBody(a.body.x, a.body.y, a.body.z);
  for (let i = 0; i < 120; i++) {
    const c = cmd({ mx: i % 7 < 3 ? 1 : 0, mz: i % 11 < 6 ? 1 : -0.5, yaw: i * 0.07, buttons: (i % 17 === 0 ? BTN.jump : 0) | (i % 9 < 4 ? BTN.sprint : 0) });
    room.pushCmd("a", c);
    room.step();
    const input: MoveInput = { mx: c.mx, mz: c.mz, yaw: c.yaw, jump: Boolean(c.buttons & BTN.jump), sprint: Boolean(c.buttons & BTN.sprint), ads: false, dash: false };
    stepTick(local, input, HEROES.striker.speed, room.map);
    assert.equal(a.body.x, local.x);
    assert.equal(a.body.y, local.y);
    assert.equal(a.body.z, local.z);
    assert.equal(a.ackSeq, c.seq);
  }
});

test("the input queue cannot be used to speed hack, replay, or flood", () => {
  const { room } = makeRoom([{ id: "a" }, { id: "b" }], { map: openMap() });
  const a = room.member("a")!;
  const start = a.body.x;
  const first = cmd({ mz: 1, yaw: FACE_X });
  assert.equal(room.pushCmd("a", first), true);
  assert.equal(room.pushCmd("a", first), false, "duplicate sequence numbers are dropped");
  assert.equal(room.pushCmd("a", { ...first, seq: first.seq - 1 }), false, "old sequence numbers are dropped");
  for (let i = 0; i < 100; i++) room.pushCmd("a", cmd({ mz: 1, yaw: FACE_X }));
  assert.ok(a.queue.length <= MAX_QUEUED_CMDS);
  room.step();
  assert.ok(Math.abs(a.body.x - start) <= HEROES.striker.speed * (1 / 30) + 0.01, "one tick moves one tick");
  assert.equal(room.pushCmd("ghost-user", cmd()), false);
});

test("bullets hit torsos, heads do more, teammates and walls are safe", () => {
  const { room, b } = duel();
  fire(room, "a");
  const body = b.maxHp - b.hp;
  assert.equal(body, Math.round(WEAPONS.pulse.damage), "a torso hit does base damage");
  b.hp = b.maxHp;
  advance(room, 10);
  fire(room, "a", { pitch: 0 });
  const head = b.maxHp - b.hp;
  assert.ok(head > body * 1.4, `headshot ${head} vs body ${body}`);

  b.hp = b.maxHp; b.team = 0;
  advance(room, 10);
  fire(room, "a");
  assert.equal(b.hp, b.maxHp, "no friendly fire");

  const walled = duel({ map: openMap([solid("wall", 4, 5, 0, 5, -5, 5)]) });
  walled.b.hp = walled.b.maxHp;
  fire(walled.room, "a");
  assert.equal(walled.b.hp, walled.b.maxHp, "walls block bullets");
});

test("weapons enforce cooldown, ammo, reload, semi-auto and range", () => {
  const { room, a, b } = duel();
  fire(room, "a");
  const afterOne = b.hp;
  fire(room, "a");
  assert.equal(b.hp, afterOne, "the fire interval blocks a second shot on the very next tick");
  advance(room, 3);
  fire(room, "a");
  assert.ok(b.hp < afterOne, "after the interval another shot lands");

  b.hp = 10000; b.maxHp = 10000;
  a.ammo[0] = 2; a.nextFire = 0;
  advance(room, 4);
  for (let i = 0; i < 10; i++) fire(room, "a");
  assert.equal(a.ammo[0], 0);
  assert.ok(a.reloadEnd > 0, "an empty magazine starts a reload");
  const during = b.hp;
  fire(room, "a");
  assert.equal(b.hp, during, "cannot shoot while reloading");
  advance(room, 80);
  room.pushCmd("a", cmd({ yaw: FACE_X }));
  room.step();
  assert.equal(a.ammo[0], WEAPONS.pulse.mag);

  room.pushCmd("a", cmd({ yaw: FACE_X, weaponSel: 2 }));
  room.step();
  assert.equal(a.weapon, 2);
  advance(room, 12);
  const railBefore = b.hp;
  fire(room, "a");
  assert.equal(railBefore - b.hp, WEAPONS.rail.damage);
  a.nextFire = 0;
  b.hp = b.maxHp;
  fire(room, "a");
  assert.equal(b.hp, b.maxHp, "semi-auto weapons need a fresh trigger pull");
  room.pushCmd("a", cmd({ yaw: FACE_X }));
  room.step();
  fire(room, "a");
  assert.ok(b.hp < b.maxHp);

  place(room, "b", 28, 0, 0);
  a.weapon = 0; a.switchEnd = 0; a.nextFire = 0; a.ammo[0] = 30; a.prevFire = false;
  b.hp = b.maxHp;
  room.pushCmd("a", cmd({ yaw: FACE_X, weaponSel: 1 }));
  room.step();
  advance(room, 12);
  fire(room, "a");
  assert.equal(b.hp, b.maxHp, "a shotgun cannot reach 28 m");
});

test("shotgun pellets add up and fall off with distance", () => {
  const near = duel();
  place(near.room, "b", 4, 0, 0);
  near.room.pushCmd("a", cmd({ yaw: FACE_X, weaponSel: 1 }));
  near.room.step();
  advance(near.room, 12);
  fire(near.room, "a", { buttons: BTN.fire | BTN.ads, pitch: 0.17 });
  const nearDamage = near.b.maxHp - near.b.hp;
  const far = duel();
  place(far.room, "b", 20, 0, 0);
  far.room.pushCmd("a", cmd({ yaw: FACE_X, weaponSel: 1 }));
  far.room.step();
  advance(far.room, 12);
  fire(far.room, "a", { buttons: BTN.fire | BTN.ads, pitch: 0.07 });
  const farDamage = far.b.maxHp - far.b.hp;
  assert.ok(nearDamage > farDamage && nearDamage > 20, `near ${nearDamage}, far ${farDamage}`);
});

test("lag compensation hits where the shooter saw the target, within a bounded window", () => {
  const { room, b } = duel();
  advance(room, 5);
  const seen = room.tick; // the tick the shooter's screen showed b at x=10
  place(room, "b", 10, 0, 7); // b has since moved out of the line of fire
  advance(room, 2);
  fire(room, "a", { viewTick: seen });
  assert.ok(b.hp < b.maxHp, "rewound hit registers");

  b.hp = b.maxHp; room.member("a")!.nextFire = 0;
  advance(room, 10);
  fire(room, "a", { viewTick: room.tick - 1 });
  assert.equal(b.hp, b.maxHp, "no rewind means a miss on the moved target");

  advance(room, 20);
  room.member("a")!.nextFire = 0;
  place(room, "b", 10, 0, 0);
  advance(room, 3);
  const ancient = room.tick - 1; // b really was on the line of fire here...
  place(room, "b", 10, 0, 9);
  advance(room, 24); // ...but has been elsewhere for far longer than the rewind cap
  b.hp = b.maxHp;
  fire(room, "a", { viewTick: ancient });
  assert.equal(b.hp, b.maxHp, "rewinds older than the cap are clamped, not honoured");
});

test("kills score, respawn with protection, and can end the match", () => {
  const { room, cap, a, b } = duel();
  b.hp = 5;
  fire(room, "a");
  assert.equal(b.alive, false);
  assert.equal(a.kills, 1);
  assert.equal(b.deaths, 1);
  assert.equal(room.scores[0], 1);
  assert.ok(cap.events.some((e) => e.name === "feed" && e.payload.k === a.slot && e.payload.v === b.slot));
  assert.ok(cap.events.some((e) => e.target === "a" && e.name === "hit" && e.payload.k === true));
  assert.ok(cap.events.some((e) => e.target === "b" && e.name === "hurt"));
  advance(room, RESPAWN_TICKS - 2);
  assert.equal(b.alive, false);
  advance(room, 4);
  assert.equal(b.alive, true);
  assert.equal(b.hp, b.maxHp);
  assert.ok(room.tick < b.protectUntil);

  const hp = b.hp;
  place(room, "b", 10, 0, 0);
  room.damage(b, a, 50, false, 0);
  assert.equal(b.hp, hp, "spawn protection absorbs damage");
  advance(room, SPAWN_PROTECT_TICKS + 1);
  room.scores[0] = KILL_LIMIT - 1;
  b.hp = 1;
  a.nextFire = 0;
  fire(room, "a");
  room.step();
  assert.equal(room.phase, "ended");
  assert.equal(room.winner, 0);
});

test("hero abilities: dash, barrier, cloak, heal", () => {
  const striker = duel();
  const before = striker.a.body.x;
  striker.room.pushCmd("a", cmd({ yaw: FACE_X, buttons: BTN.ability }));
  striker.room.step();
  advance(striker.room, 6);
  assert.ok(striker.a.body.x - before > 3, "striker dashes forward");
  assert.ok(striker.a.abilityReady > striker.room.tick, "ability goes on cooldown");

  const warden = duel({ heroes: ["striker", "warden"] });
  const plain = warden.b.maxHp;
  warden.room.pushCmd("b", cmd({ yaw: -FACE_X, buttons: BTN.ability }));
  warden.room.step();
  warden.room.damage(warden.b, warden.a, 20, false, 0);
  assert.equal(plain - warden.b.hp, Math.round(20 * 0.4));

  const ghost = duel({ heroes: ["striker", "ghost"] });
  ghost.room.pushCmd("b", cmd({ yaw: -FACE_X, buttons: BTN.ability }));
  ghost.room.step();
  const enemyView = lastSnapshot(ghost.cap, "a");
  assert.equal(enemyView.players.some((p) => p.slot === ghost.b.slot), false, "cloaked players are removed from enemy snapshots");
  const ownView = lastSnapshot(ghost.cap, "b");
  assert.ok(ownView.players.some((p) => p.slot === ghost.b.slot && (p.flags & FLAG.cloak)));
  ghost.room.pushCmd("b", cmd({ yaw: -FACE_X, buttons: BTN.fire }));
  ghost.room.step();
  assert.equal(ghost.b.cloakUntil, 0, "firing breaks cloak");

  const medic = duel({ heroes: ["medic", "striker"] });
  medic.b.team = 0;
  medic.a.hp = 30; medic.b.hp = 30;
  place(medic.room, "b", 3, 0, 0);
  medic.room.pushCmd("a", cmd({ yaw: FACE_X, buttons: BTN.ability }));
  medic.room.step();
  assert.equal(medic.a.hp, 70);
  assert.equal(medic.b.hp, 70);
});

test("snapshots carry the private block, acks and cloak rules, and spawns are sane", () => {
  const { room, cap, a } = duel();
  const c = cmd({ mz: 1, yaw: FACE_X });
  room.pushCmd("a", c);
  room.step();
  const snap = lastSnapshot(cap, "a");
  assert.equal(snap.own?.ackSeq, c.seq);
  assert.equal(snap.players.length, 2);
  assert.ok(Math.abs(snap.own!.x - a.body.x) < 1e-3);
  assert.equal(snap.tick, room.tick);
  assert.equal(snap.own?.ammo[0], WEAPONS.pulse.mag);
  for (const m of room.allMembers()) {
    m.alive = false; m.respawnTick = room.tick;
  }
  room.step();
  for (const m of room.allMembers()) {
    assert.equal(m.alive, true);
    assert.ok(room.map.bounds.minX < m.body.x && m.body.x < room.map.bounds.maxX);
  }
});

test("disconnects keep the seat for a grace period and then free it", () => {
  const { room } = makeRoom([{ id: "a" }, { id: "b" }, { id: "c" }], { map: openMap() });
  const slot = room.member("b")!.slot;
  room.disconnect("b");
  advance(room, 30);
  assert.ok(room.has("b"));
  const back = room.join("b", "b", "striker");
  assert.ok(back.ok && back.reclaimed && back.slot === slot);
  room.disconnect("b");
  advance(room, DISCONNECT_GRACE_TICKS + 2);
  assert.equal(room.has("b"), false);
  assert.equal(room.slots[slot], null);
});

test("names are sanitised and hero changes apply on the next spawn", () => {
  const { room } = makeRoom([{ id: "a" }, { id: "b" }], { live: false });
  room.join("x", "  <b>Evil\u0007Name</b>   with    spaces that are far too long  ", "ghost");
  const name = room.member("x")!.name;
  assert.ok(name.length <= 18 && !/[<>\u0007]/.test(name));
  assert.equal(room.join("y", "   ", "ghost").ok, true);
  assert.equal(room.member("y")!.name, "Player");
  advance(room, COUNTDOWN_TICKS + 2);
  const a = room.member("a")!;
  a.protectUntil = 0;
  room.setHero("a", "warden");
  assert.equal(a.hero, "striker", "heroes change at respawn during a live match");
  assert.equal(a.nextHero, "warden");
  room.damage(a, room.member("b")!, 9999, false, 0);
  advance(room, RESPAWN_TICKS + 2);
  assert.equal(a.hero, "warden");
  assert.equal(a.maxHp, HEROES.warden.maxHp);
});
