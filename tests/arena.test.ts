import test from "node:test";
import assert from "node:assert/strict";
import { mindbopArena } from "../server/games/arena/module";

test("Arena synchronizes server-authoritative movement", () => {
  let now = 1_000;
  const state = mindbopArena.create(["alpha", "bravo"], now);
  const before = state.players.alpha.z;
  mindbopArena.input?.(state, "alpha", 0, 1, now, false, true);
  for (let index = 0; index < 30; index++) { now += 16.67; mindbopArena.tick(state, ["alpha", "bravo"], now); }
  assert.ok(state.players.alpha.z > before + 3);
  assert.equal(mindbopArena.project(state, "bravo").players.alpha.z, state.players.alpha.z);
  assert.ok(["neon-yard", "skyline", "reactor"].includes(state.mapId));
  assert.throws(() => mindbopArena.create(["solo"], now), /2–10/);
});

test("Arena jump returns to the authoritative floor", () => {
  let now = 5_000;
  const state = mindbopArena.create(["alpha", "bravo"], now);
  mindbopArena.input?.(state, "alpha", 0, 0, now, true, false);
  now += 50; mindbopArena.tick(state, ["alpha", "bravo"], now);
  assert.ok(state.players.alpha.y > 1);
  for (let index = 0; index < 80; index++) { now += 16.67; mindbopArena.tick(state, ["alpha", "bravo"], now); }
  assert.ok(state.players.alpha.y >= 1);
});

test("Arena validates weapons server-side and registers a lag-compensated hit", () => {
  let now = 10_000;
  const state = mindbopArena.create(["alpha", "bravo"], now);
  state.players.alpha.x = -12; state.players.alpha.z = 0; state.players.alpha.rotation = Math.PI / 2; state.players.alpha.weapon = "pulse";
  state.players.bravo.x = 12; state.players.bravo.z = 0;
  const hp = state.players.bravo.hp;
  mindbopArena.act(state, "alpha", { type: "shoot", weapon: "rail", yaw: Math.PI / 2, pitch: 0, shotAt: now }, now);
  assert.equal(state.players.bravo.hp, hp);
  now += 950;
  mindbopArena.act(state, "alpha", { type: "shoot", weapon: "pulse", yaw: Math.PI / 2, pitch: 0, shotAt: now - 120 }, now);
  assert.ok(state.players.bravo.hp < hp);
});

test("Arena hero abilities change authoritative state", () => {
  const now = 20_000;
  const state = mindbopArena.create(["alpha", "bravo"], now);
  state.players.alpha.hero = "striker";
  const before = state.players.alpha.x;
  mindbopArena.act(state, "alpha", { type: "ability" }, now);
  assert.ok(Math.abs(state.players.alpha.x - before) > 3);
  state.players.bravo.hero = "warden";
  mindbopArena.act(state, "bravo", { type: "ability" }, now);
  assert.ok(state.players.bravo.shieldUntil > now);
});

test("Arena awards private skill-card choices after a completed capture", () => {
  let now = 30_000;
  const state = mindbopArena.create(["alpha", "bravo"], now);
  state.players.alpha.x = state.zone.x;
  state.players.alpha.z = state.zone.z;
  state.players.bravo.x = 15;
  state.players.bravo.z = 15;
  for (let index = 0; index < 200; index++) { now += 50; mindbopArena.tick(state, ["alpha", "bravo"], now); }
  assert.ok(state.scores.ember >= 10 || state.scores.azure >= 10);
  const teamPlayer = state.players.alpha;
  assert.equal(teamPlayer.pendingCards.length, 3);
  const selected = teamPlayer.pendingCards[0];
  mindbopArena.act(state, "alpha", { type: "card", card: selected }, now);
  assert.ok(teamPlayer.cards.includes(selected));
  assert.equal(teamPlayer.pendingCards.length, 0);
});

test("Arena resolves solid-map collision without allowing players through cover", () => {
  let now = 40_000;
  const state = mindbopArena.create(["alpha", "bravo"], now);
  state.mapId = "neon-yard";
  state.players.alpha.x = -13;
  state.players.alpha.z = 0;
  mindbopArena.input?.(state, "alpha", 1, 0, now, false, false);
  for (let index = 0; index < 100; index++) { now += 16.67; mindbopArena.tick(state, ["alpha", "bravo"], now); }
  assert.ok(state.players.alpha.x < -10.5);
});
