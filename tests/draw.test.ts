import test from "node:test";
import assert from "node:assert/strict";
import { mindbopDraw, addDrawPoints } from "../server/games/draw/module";

test("draw keeps choices private, validates the artist, scores guesses and syncs strokes", () => {
  let now = 1_000;
  const state = mindbopDraw.create(["artist", "guesser"], now, {
    rounds: 1,
    drawTime: 60,
    chooseTime: 15,
    maxPlayers: 8,
  });
  assert.equal(mindbopDraw.project(state, "guesser").choices, undefined);
  assert.equal(mindbopDraw.project(state, "artist").choices?.length, 3);
  assert.throws(() =>
    mindbopDraw.act(state, "guesser", { type: "choose-word", index: 0 }, now),
  );
  mindbopDraw.act(state, "artist", { type: "choose-word", index: 0 }, now);
  const word = mindbopDraw.project(state, "artist").word;
  assert.equal(mindbopDraw.project(state, "guesser").word, "");
  addDrawPoints(state, "guesser", [
    {
      id: "a",
      x: 0.1,
      y: 0.1,
      color: "#000000",
      size: 8,
      erase: false,
      start: true,
    },
  ]);
  assert.equal(state.strokes.length, 0);
  addDrawPoints(state, "artist", [
    {
      id: "a",
      x: 0.1,
      y: 0.1,
      color: "#000000",
      size: 8,
      erase: false,
      start: true,
    },
  ]);
  assert.equal(state.strokes.length, 1);
  mindbopDraw.act(
    state,
    "artist",
    { type: "fill-canvas", color: "#ff0000" },
    now,
  );
  assert.equal(state.strokes.at(-1)?.fill, true);
  mindbopDraw.act(
    state,
    "guesser",
    { type: "guess", text: word.slice(0, -1) },
    now,
  );
  assert.match(
    mindbopDraw.project(state, "guesser").guessFeedback ?? "",
    /close/i,
  );
  now += 5_000;
  mindbopDraw.act(
    state,
    "guesser",
    { type: "guess", text: word.toUpperCase() },
    now,
  );
  assert.ok(state.scores.guesser >= 100);
  assert.equal(state.phase, "round-end");
});

test("draw difficulty selects from distinct server-side word pools", () => {
  const easy = mindbopDraw.create(["a", "b"], 0, {
    rounds: 1,
    drawTime: 30,
    chooseTime: 10,
    maxPlayers: 8,
    difficulty: "easy",
  });
  const hard = mindbopDraw.create(["a", "b"], 0, {
    rounds: 1,
    drawTime: 30,
    chooseTime: 10,
    maxPlayers: 8,
    difficulty: "hard",
  });
  assert.equal(easy.settings.difficulty, "easy");
  assert.equal(hard.settings.difficulty, "hard");
  assert.ok(hard.choices?.every((word) => word.includes(" ")));
});

test("draw auto-selects and rotates through every player", () => {
  let now = 10_000;
  const state = mindbopDraw.create(["a", "b"], now, {
    rounds: 1,
    drawTime: 30,
    chooseTime: 10,
    maxPlayers: 8,
  });
  now += 10_001;
  mindbopDraw.tick(state, ["a", "b"], now);
  assert.equal(state.phase, "drawing");
  assert.ok(state.secret);
  now += 30_001;
  mindbopDraw.tick(state, ["a", "b"], now);
  assert.equal(state.phase, "round-end");
  now += 4_501;
  mindbopDraw.tick(state, ["a", "b"], now);
  assert.equal(state.drawerId, "b");
  mindbopDraw.act(state, "b", { type: "choose-word", index: 0 }, now);
  now += 30_001;
  mindbopDraw.tick(state, ["a", "b"], now);
  now += 4_501;
  mindbopDraw.tick(state, ["a", "b"], now);
  assert.equal(state.finished, true);
});

test("draw reveals server-timed hints without leaking the word", () => {
  const started = 50_000;
  const state = mindbopDraw.create(["a", "b"], started, {
    rounds: 1,
    drawTime: 60,
    chooseTime: 10,
    maxPlayers: 8,
  });
  mindbopDraw.act(state, "a", { type: "choose-word", index: 0 }, started);
  const hidden = state.hint;
  mindbopDraw.tick(state, ["a", "b"], started + 28_000);
  assert.notEqual(state.hint, hidden);
  assert.notEqual(state.hint.replaceAll(" ", ""), state.secret);
  assert.equal(mindbopDraw.project(state, "b").word, "");
});
