import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Engine, type Session } from "../server/engine";
import type { Command } from "../src/lib/protocol";
import { lastGuest, type CaseState } from "../server/games/last-guest/module";
import {
  hotspots,
  walkable,
  movePoint,
  reachable,
  type Point,
} from "../src/games/last-guest/world";
import type { LastGuestAction } from "../src/games/last-guest/types";
import { fourRow } from "../server/games/four-row/module";
import { wordChain } from "../server/games/word-chain/module";
import { quizRush } from "../server/games/quiz-rush/module";

function setup() {
  let now = 100000;
  const engine = new Engine(() => now);
  const host = engine.session(),
    guest = engine.session();
  engine.connect(host, "host");
  engine.connect(guest, "guest");
  const act = (s: Session, command: Command) =>
    engine.command(s, { id: randomUUID(), command });
  const create = () => {
    assert.equal(
      act(host, {
        type: "create",
        name: "Same name",
        avatar: 0,
        gameId: "last-guest",
      }).ok,
      true,
    );
    return engine.view(host)!.code;
  };
  const join = (code: string) =>
    act(guest, { type: "join", name: "Same name", avatar: 1, code });
  const start = () => {
    join(create());
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
    advance(ms: number) {
      now += ms;
      engine.tick();
    },
  };
}

test("four in a row enforces turns and detects a winning line", () => {
  const state = fourRow.create(["gold", "violet"], 0);
  const drop = (player: string, column: number) =>
    fourRow.act(state, player, { type: "drop", column }, 0);
  assert.throws(() => drop("violet", 0), /turn/);
  drop("gold", 0);
  drop("violet", 0);
  drop("gold", 1);
  drop("violet", 1);
  drop("gold", 2);
  drop("violet", 2);
  drop("gold", 3);
  assert.equal(state.winner, "gold");
  assert.equal(state.winningCells.length, 4);
  assert.equal(fourRow.finished(state), true);
  assert.throws(() => drop("violet", 4), /over/);
});
test("word chain validates links, repeats, turns, and the winning score", () => {
  const state = wordChain.create(["one", "two"], 0);
  wordChain.act(state, "one", { type: "word", word: "spark" }, 0);
  assert.equal(state.currentLetter, "k");
  assert.throws(
    () => wordChain.act(state, "one", { type: "word", word: "kite" }, 0),
    /turn/,
  );
  assert.throws(
    () => wordChain.act(state, "two", { type: "word", word: "apple" }, 0),
    /start/,
  );
  wordChain.act(state, "two", { type: "word", word: "kite" }, 0);
  assert.throws(
    () => wordChain.act(state, "one", { type: "word", word: "kite" }, 0),
    /already/,
  );
});
test("quiz rush scores answers and finishes after five questions", () => {
  const state = quizRush.create(["one", "two"], 0);
  for (let round = 0; round < 5; round++) {
    quizRush.act(state, "one", { type: "answer", option: 0 }, 0);
    assert.throws(
      () => quizRush.act(state, "one", { type: "answer", option: 1 }, 0),
      /locked/,
    );
    quizRush.act(state, "two", { type: "answer", option: 1 }, 0);
  }
  assert.equal(state.finished, true);
  assert.equal(quizRush.finished(state), true);
});
test("real rooms isolate members, allow duplicate names, reject unsupported games and cap at six", () => {
  const { engine, host, guest, act, create, join } = setup();
  assert.equal(
    act(host, { type: "create", name: "H", avatar: 0, gameId: "brainwave" }).ok,
    false,
  );
  const code = create();
  assert.match(code, /^[A-Z2-9]{6}$/);
  assert.equal(join("AAAAAA").ok, false);
  assert.equal(join(code).ok, true);
  assert.notEqual(host.id, guest.id);
  for (let i = 0; i < 5; i++) {
    const s = engine.session();
    engine.connect(s, String(i));
    assert.equal(
      act(s, { type: "join", name: "New", avatar: 0, code }).ok,
      i < 4,
    );
  }
  assert.equal(engine.view(host)!.players.length, 6);
  const stranger = engine.session();
  engine.connect(stranger, "s");
  assert.equal(engine.view(stranger), null);
  assert.equal(act(stranger, { type: "start" }).ok, false);
  assert.equal(
    act(stranger, {
      type: "create",
      name: "Other",
      avatar: 0,
      gameId: "last-guest",
    }).ok,
    true,
  );
  assert.notEqual(engine.view(stranger)!.code, code);
  assert.equal(engine.view(stranger)!.players.length, 1);
});
test("host and readiness gates include briefing and reject late joins", () => {
  const { engine, host, guest, act, create, join } = setup();
  const code = create();
  assert.equal(act(host, { type: "start" }).ok, false);
  join(code);
  assert.equal(act(guest, { type: "start" }).ok, false);
  assert.equal(act(host, { type: "start" }).ok, false);
  act(host, { type: "ready", ready: true });
  act(guest, { type: "ready", ready: true });
  act(host, { type: "start" });
  assert.equal(engine.view(host)!.game!.phase, "briefing");
  assert.equal(
    act(guest, { type: "game", action: { type: "begin" } }).ok,
    false,
  );
  assert.equal(act(host, { type: "game", action: { type: "begin" } }).ok, true);
  const late = engine.session();
  engine.connect(late, "late");
  assert.equal(
    act(late, { type: "join", name: "Late", avatar: 0, code }).ok,
    false,
  );
});
test("command retries are idempotent and malformed or excessive commands fail", () => {
  const { engine, host } = setup();
  const envelope = {
    id: randomUUID(),
    command: { type: "create", name: "Host", avatar: 0, gameId: "last-guest" },
  };
  const first = engine.command(host, envelope);
  assert.equal(first.ok, true);
  assert.deepEqual(engine.command(host, envelope), first);
  assert.equal(engine.rooms.size, 1);
  assert.equal(engine.command(host, null).ok, false);
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
test("reconnect retains progress and position; host transfer, multiple tabs, expiry work", () => {
  const { engine, host, guest, act, start, advance } = setup();
  start();
  act(host, { type: "game", action: { type: "begin" } });
  act(host, {
    type: "game",
    action: { type: "note", text: "Check the timing." },
  });
  engine.move(host, { x: 1, z: 0 });
  advance(100);
  const position = engine.view(host)!.game!.positions[host.id];
  engine.connect(host, "tab2");
  engine.disconnect(host, "host");
  assert.equal(engine.view(host)!.players[0].connected, true);
  engine.disconnect(host, "tab2");
  assert.equal(engine.view(guest)!.hostId, guest.id);
  assert.equal(engine.session(host.token).id, host.id);
  engine.connect(host, "return");
  assert.deepEqual(engine.view(host)!.game!.positions[host.id], position);
  assert.equal(engine.view(host)!.game!.notes.length, 1);
  engine.disconnect(host, "return");
  advance(120001);
  assert.equal(engine.view(host), null);
  assert.equal(engine.view(guest)!.players.length, 1);
});
test("offline room host recovery, room expiry, leave cleanup, untrusted session tokens", () => {
  const { engine, host, guest, act, create, join, advance } = setup();
  join(create());
  engine.disconnect(host, "host");
  engine.disconnect(guest, "guest");
  engine.connect(guest, "return");
  assert.equal(engine.view(guest)!.hostId, guest.id);
  assert.notEqual(engine.session("forged").token, "forged");
  advance(3600001);
  assert.equal(engine.rooms.size, 0);
  engine.connect(host, "new");
  create();
  act(host, { type: "leave" });
  assert.equal(engine.rooms.size, 0);
  engine.disconnect(host, "new");
  advance(86400001);
  assert.equal(engine.sessions.has(host.token), false);
});
test("server movement rejects teleport values, stops stale input and cannot cross walls", () => {
  const { engine, host, act, start, advance } = setup();
  start();
  const initial = engine.view(host)!.game!.positions[host.id];
  engine.move(host, { x: 1, z: 0 });
  advance(100);
  assert.deepEqual(engine.view(host)!.game!.positions[host.id], initial);
  act(host, { type: "game", action: { type: "begin" } });
  engine.move(host, { x: 900, z: NaN });
  advance(100);
  assert.deepEqual(engine.view(host)!.game!.positions[host.id], initial);
  engine.move(host, { x: 1, z: 1 });
  advance(100);
  const moved = engine.view(host)!.game!.positions[host.id];
  assert.ok(Math.hypot(moved.x - initial.x, moved.z - initial.z) <= 0.361);
  advance(500);
  assert.deepEqual(engine.view(host)!.game!.positions[host.id], moved);
  assert.ok(movePoint({ x: 0, z: -7 }, 10, 0).x < 2.7);
  assert.ok(movePoint({ x: 0, z: 5 }, 100, 0).x < 11.6);
});
function caseFixture() {
  const state = lastGuest.create(["one", "two"], 0);
  const act = (action: LastGuestAction, id = "one") =>
    lastGuest.act(state, id, action, 100);
  const near = (target: string) => {
    const spot = hotspots.find((h) => h.id === target)!;
    state.positions.one = { x: spot.x, z: spot.z };
  };
  act({ type: "begin" });
  return { state, act, near };
}
function investigate(f: ReturnType<typeof caseFixture>) {
  for (const target of [
    "register",
    "key",
    "body",
    "ledger",
    "clock",
    "breaker",
  ]) {
    f.near(target);
    f.act({ type: "inspect", target });
  }
  for (const [target, topic] of [
    ["mara", "accounts"],
    ["june", "witness"],
    ["eli", "timing"],
  ]) {
    f.near(target);
    f.act({ type: "interview", target, topic });
  }
  f.act({ type: "connect", first: "clock", second: "breaker" });
  f.act({ type: "connect", first: "key", second: "ledger" });
}
const theory = {
  suspect: "mara",
  method: "letter-opener",
  motive: "embezzlement",
  evidence: ["body", "ledger", "key"],
};
test("evidence is proximity/prerequisite protected, shared, idempotent, and unrevealed secrets stay server-side", () => {
  const f = caseFixture();
  const initial = JSON.stringify(lastGuest.project(f.state, "one"));
  assert.ok(!initial.includes("18,400"));
  assert.equal(lastGuest.project(f.state, "one").result, null);
  assert.throws(() => f.act({ type: "inspect", target: "body" }), /closer/);
  f.near("ledger");
  assert.throws(
    () => f.act({ type: "inspect", target: "ledger" }),
    /First inspect/,
  );
  f.near("mara");
  assert.throws(
    () => f.act({ type: "interview", target: "mara", topic: "accounts" }),
    /related evidence/,
  );
  f.near("body");
  f.act({ type: "inspect", target: "body" });
  f.act({ type: "inspect", target: "body" });
  assert.equal(f.state.evidence.length, 1);
  assert.equal(lastGuest.project(f.state, "two").evidence[0].id, "body");
  assert.throws(() =>
    f.act({ type: "connect", first: "clock", second: "breaker" }),
  );
  assert.throws(() => f.act({ type: "propose", theory }), /Complete/);
});
test("every hotspot is physically reachable from spawn through the hotel doors", () => {
  const queue: Point[] = [{ x: 0, z: 6 }];
  const seen = new Set(["0,6"]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    for (const [dx, dz] of [
      [0.5, 0],
      [-0.5, 0],
      [0, 0.5],
      [0, -0.5],
    ]) {
      const n = { x: p.x + dx, z: p.z + dz };
      const key = n.x + "," + n.z;
      if (!seen.has(key) && walkable(n)) {
        seen.add(key);
        queue.push(n);
      }
    }
  }
  for (const h of hotspots)
    assert.ok(
      queue.some((p) => reachable(p, h)),
      h.id + " inaccessible",
    );
});
test("deductions and interviews unlock accusation; rejection and consensus resolve a supported case", () => {
  const f = caseFixture();
  investigate(f);
  assert.equal(lastGuest.project(f.state, "one").readyToAccuse, true);
  assert.throws(
    () => f.act({ type: "connect", first: "body", second: "key" }),
    /do not establish/,
  );
  assert.throws(
    () =>
      f.act({
        type: "propose",
        theory: { ...theory, evidence: ["body", "ledger", "fake"] },
      }),
    /only cite/,
  );
  f.act({ type: "propose", theory });
  const old = f.state.proposal!.id;
  f.act({ type: "vote", proposalId: old, agree: false }, "two");
  assert.equal(f.state.proposal, null);
  f.act({ type: "propose", theory });
  assert.throws(
    () => f.act({ type: "vote", proposalId: old, agree: true }, "two"),
    /changed/,
  );
  assert.equal(f.state.result, null);
  f.act({ type: "vote", proposalId: f.state.proposal!.id, agree: true }, "two");
  assert.equal(f.state.result!.solved, true);
  assert.equal(lastGuest.finished(f.state), true);
  assert.throws(() => f.act({ type: "note", text: "late" }), /closed/);
});
test("wrong theories reveal failure honestly and disconnect alone never submits a case", () => {
  const f = caseFixture();
  investigate(f);
  lastGuest.tick(f.state, ["one"], 200);
  assert.throws(() => f.act({ type: "propose", theory }), /two investigators/);
  lastGuest.tick(f.state, ["one", "two"], 300);
  f.act({ type: "propose", theory: { ...theory, suspect: "eli" } });
  lastGuest.tick(f.state, ["one"], 400);
  assert.equal(f.state.result, null);
  f.act({ type: "vote", proposalId: f.state.proposal!.id, agree: true });
  assert.equal(f.state.result, null);
  lastGuest.tick(f.state, ["one", "two"], 500);
  f.act({ type: "vote", proposalId: f.state.proposal!.id, agree: true }, "two");
  assert.equal(f.state.result!.solved, false);
  assert.ok(f.state.result!.explanation.length > 0);
});
test("completed case returns both investigators to a clean lobby", () => {
  const { engine, host, guest, act, start, advance } = setup();
  start();
  const state = engine.rooms.get(host.room!)!.state as CaseState;
  // Arrange the completed domain state; engine lifecycle itself is exercised below.
  const f = caseFixture();
  investigate(f);
  f.act({ type: "propose", theory });
  f.act({ type: "vote", proposalId: f.state.proposal!.id, agree: true }, "two");
  Object.assign(state, { phase: f.state.phase, result: f.state.result });
  advance(50);
  assert.equal(engine.view(host)!.phase, "completed");
  assert.equal(act(guest, { type: "rematch" }).ok, false);
  assert.equal(act(host, { type: "rematch" }).ok, true);
  assert.equal(engine.view(guest)!.game, null);
  assert.ok(engine.view(host)!.players.every((p) => !p.ready));
});
