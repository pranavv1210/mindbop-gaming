import test from "node:test";
import assert from "node:assert/strict";
import { mindbopArena } from "../server/games/arena/module";

test("Arena synchronizes server-authoritative movement", () => {
  let now = 1_000;
  const state = mindbopArena.create(["alpha", "bravo"], now);
  const before = state.players.alpha.z;
  mindbopArena.input?.(state, "alpha", 0, 1, now, false, true);
  for (let index = 0; index < 30; index++) {
    now += 16.67;
    mindbopArena.tick(state, ["alpha", "bravo"], now);
  }
  assert.ok(state.players.alpha.z > before + 3);
  assert.equal(mindbopArena.project(state, "bravo").players.alpha.z, state.players.alpha.z);
  assert.throws(() => mindbopArena.create(["solo"], now), /2–10/);
});

test("Arena jump returns to the authoritative floor", () => {
  let now = 5_000;
  const state = mindbopArena.create(["alpha", "bravo"], now);
  mindbopArena.input?.(state, "alpha", 0, 0, now, true, false);
  now += 50;
  mindbopArena.tick(state, ["alpha", "bravo"], now);
  assert.ok(state.players.alpha.y > 1);
  for (let index = 0; index < 80; index++) {
    now += 16.67;
    mindbopArena.tick(state, ["alpha", "bravo"], now);
  }
  assert.ok(state.players.alpha.y >= 1);
});
