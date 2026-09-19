import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Engine, type Session } from "../server/engine";
import type { Command } from "../src/lib/protocol";
import { brainwave } from "../server/games/brainwave";
function setup() {
  let now = 100000;
  const engine = new Engine(() => now);
  const host = engine.session();
  const guest = engine.session();
  engine.connect(host, "host");
  engine.connect(guest, "guest");
  const act = (s: Session, command: Command) =>
    engine.command(s, { id: randomUUID(), command });
  const create = () => {
    const result = act(host, {
      type: "create",
      name: "Same name",
      avatar: 0,
      gameId: "brainwave",
      rounds: 3,
    });
    assert.equal(result.ok, true);
    return engine.view(host)!.code;
  };
  const join = (code: string) =>
    act(guest, { type: "join", name: "Same name", avatar: 1, code });
  const start = () => {
    const code = create();
    assert.equal(join(code).ok, true);
    act(host, { type: "ready", ready: true });
    act(guest, { type: "ready", ready: true });
    assert.equal(act(host, { type: "start" }).ok, true);
  };
  return {
    engine,
    host,
    guest,
    act,
    create,
    join,
    start,
    advance: (ms: number) => {
      now += ms;
      engine.tick();
    },
  };
}
test("room creation, validation, duplicate names, isolation, and membership", () => {
  const { engine, host, guest, act, create, join } = setup();
  const code = create();
  assert.match(code, /^[A-Z2-9]{6}$/);
  assert.equal(join("AAAAAA").ok, false);
  assert.equal(join(code).ok, true);
  assert.equal(engine.view(host)!.players.length, 2);
  assert.notEqual(host.id, guest.id);
  const stranger = engine.session();
  engine.connect(stranger, "stranger");
  assert.equal(engine.view(stranger), null);
  assert.equal(act(stranger, { type: "start" }).ok, false);
  assert.equal(
    act(guest, {
      type: "create",
      name: "X",
      avatar: 1,
      gameId: "brainwave",
      rounds: 3,
    }).ok,
    false,
  );
  const own = act(stranger, {
    type: "create",
    name: "Stranger",
    avatar: 1,
    gameId: "brainwave",
    rounds: 3,
  });
  assert.equal(own.ok, true);
  assert.notEqual(engine.view(stranger)!.code, code);
  assert.equal(engine.view(stranger)!.players.length, 1);
});
test("host permission, ready checks, and settings reset", () => {
  const { engine, host, guest, act, create, join } = setup();
  const code = create();
  assert.equal(act(host, { type: "start" }).ok, false);
  join(code);
  assert.equal(act(guest, { type: "start" }).ok, false);
  assert.equal(act(guest, { type: "settings", rounds: 8 }).ok, false);
  assert.equal(act(host, { type: "start" }).ok, false);
  act(host, { type: "ready", ready: true });
  act(guest, { type: "ready", ready: true });
  act(host, { type: "settings", rounds: 5 });
  assert.equal(
    engine.view(host)!.players.every((p) => !p.ready),
    true,
  );
});
test("action IDs prevent double creation and answers cannot be changed or forged", () => {
  const { engine, host, guest, act, join } = setup();
  const envelope = {
    id: randomUUID(),
    command: {
      type: "create",
      name: "Host",
      avatar: 0,
      gameId: "brainwave",
      rounds: 3,
    },
  };
  const first = engine.command(host, envelope);
  assert.deepEqual(engine.command(host, envelope), first);
  assert.equal(engine.rooms.size, 1);
  join(engine.view(host)!.code);
  act(host, { type: "ready", ready: true });
  act(guest, { type: "ready", ready: true });
  act(host, { type: "start" });
  assert.equal(act(host, { type: "answer", option: 0, round: 99 }).ok, false);
  assert.equal(act(host, { type: "answer", option: 0, round: 1 }).ok, true);
  assert.equal(act(host, { type: "answer", option: 1, round: 1 }).ok, false);
  const view = engine.view(guest)!;
  assert.equal(view.game!.correct, undefined);
  assert.equal(view.game!.explanation, undefined);
  assert.equal(view.game!.selected, null);
  assert.equal(
    engine.command(guest, {
      id: randomUUID(),
      command: {
        type: "answer",
        option: 20,
        round: 1,
        score: 9000,
        playerId: host.id,
      },
    }).ok,
    false,
  );
  assert.equal(engine.view(host)!.players[0].score, 0);
});
test("complete game loop, timeout, scores, reveal, late joins, rematch", () => {
  const { engine, host, guest, act, start, advance } = setup();
  start();
  const late = engine.session();
  engine.connect(late, "late");
  assert.equal(
    act(late, {
      type: "join",
      name: "Late",
      avatar: 0,
      code: engine.view(host)!.code,
    }).ok,
    false,
  );
  for (let round = 1; round <= 3; round++) {
    assert.equal(engine.view(host)!.game!.round, round);
    act(host, { type: "answer", option: 0, round });
    advance(20001);
    const reveal = engine.view(host)!.game!;
    assert.equal(reveal.phase, "reveal");
    assert.equal(typeof reveal.correct, "number");
    assert.equal(act(guest, { type: "answer", option: 0, round }).ok, false);
    advance(6001);
  }
  assert.equal(engine.view(host)!.phase, "completed");
  assert.equal(
    engine.view(guest)!.players.find((p) => p.id === guest.id)!.score,
    0,
  );
  assert.equal(act(guest, { type: "rematch" }).ok, false);
  assert.equal(act(host, { type: "rematch" }).ok, true);
  assert.equal(engine.view(host)!.phase, "waiting");
  assert.equal(engine.view(host)!.game, null);
  assert.equal(
    engine.view(host)!.players.every((p) => !p.ready && p.score === 0),
    true,
  );
});
test("reconnection preserves ID and answers, transfers host, expires missing players", () => {
  const { engine, host, guest, act, start, advance } = setup();
  start();
  act(host, { type: "answer", option: 0, round: 1 });
  engine.disconnect(host, "host");
  assert.equal(engine.view(guest)!.hostId, guest.id);
  assert.equal(
    engine.view(guest)!.players.find((p) => p.id === host.id)!.connected,
    false,
  );
  assert.equal(engine.session(host.token).id, host.id);
  engine.connect(host, "host-new");
  assert.equal(engine.view(host)!.players.length, 2);
  assert.equal(engine.view(host)!.game!.selected, 0);
  engine.disconnect(host, "host-new");
  advance(120001);
  assert.equal(engine.view(host), null);
  assert.equal(engine.view(guest)!.players.length, 1);
});
test("multiple tabs do not duplicate players or mark an active player offline", () => {
  const { engine, host, create } = setup();
  create();
  engine.connect(host, "tab-two");
  engine.disconnect(host, "host");
  assert.equal(engine.view(host)!.players[0].connected, true);
  assert.equal(engine.view(host)!.players.length, 1);
});
test("the first player returning to an entirely offline room becomes host", () => {
  const { engine, host, guest, create, join } = setup();
  const code = create();
  join(code);
  engine.disconnect(host, "host");
  engine.disconnect(guest, "guest");
  engine.connect(guest, "returning");
  assert.equal(engine.view(guest)!.hostId, guest.id);
});
test("rooms expire and empty rooms are deleted; untrusted sessions are not adopted", () => {
  const { engine, host, act, create, advance } = setup();
  create();
  assert.notEqual(engine.session("forged").token, "forged");
  advance(3600001);
  assert.equal(engine.view(host), null);
  assert.equal(engine.rooms.size, 0);
  create();
  act(host, { type: "leave" });
  assert.equal(engine.rooms.size, 0);
  engine.disconnect(host, "host");
  advance(86400001);
  assert.equal(engine.sessions.has(host.token), false);
});
test("full rooms and unsupported games are rejected", () => {
  const { engine, host, act, create } = setup();
  assert.equal(
    act(host, {
      type: "create",
      name: "Host",
      avatar: 0,
      gameId: "bluff-club",
      rounds: 3,
    }).ok,
    false,
  );
  const code = create();
  for (let i = 0; i < 8; i++) {
    const s = engine.session();
    engine.connect(s, String(i));
    const result = act(s, {
      type: "join",
      name: `Player ${i}`,
      avatar: 0,
      code,
    });
    assert.equal(result.ok, i < 7);
  }
  assert.equal(engine.view(host)!.players.length, 8);
});
test("module awards points once, protects answers, and rejects late actions", () => {
  const state = brainwave.create(3, 0);
  const correct = state.questions[0].correct;
  brainwave.act(
    state,
    "one",
    { type: "answer", option: correct, round: 1 },
    1000,
  );
  assert.equal(brainwave.project(state, "two").selected, null);
  assert.equal(brainwave.project(state, "one").correct, undefined);
  assert.deepEqual(brainwave.tick(state, ["one"], 2000), { one: 100 });
  assert.equal(brainwave.tick(state, ["one"], 2001), null);
  assert.equal(brainwave.project(state, "one").correct, correct);
  assert.throws(() =>
    brainwave.act(state, "two", { type: "answer", option: 0, round: 1 }, 3000),
  );
});
test("malformed inputs and excessive command rates return useful errors", () => {
  const { engine, host } = setup();
  assert.equal(engine.command(host, null).ok, false);
  assert.equal(engine.command(host, { command: "oops" }).ok, false);
  let last;
  for (let i = 0; i < 35; i++)
    last = engine.command(host, {
      id: randomUUID(),
      command: { type: "ready", ready: true },
    });
  assert.deepEqual(last, {
    ok: false,
    error: "Too many actions. Wait a moment and try again.",
  });
});
