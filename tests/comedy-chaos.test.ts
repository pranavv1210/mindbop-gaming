import test from "node:test";
import assert from "node:assert/strict";
import { comedyChaos } from "../server/games/comedy-chaos/module";
import type { ComedyView } from "../src/games/comedy-chaos/types";

const ids = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
];
test("Comedy Chaos keeps authors private, validates votes, and scores on the server", () => {
  const now = 1_000;
  const state = comedyChaos.create(ids, now, {
    rounds: 3,
    answerTime: 20,
    votingTime: 10,
    doubleDown: true,
    authorGuessing: false,
    performanceMode: false,
    maxPlayers: 20,
  });
  comedyChaos.tick(state, ids, now + 3_001);
  for (let index = 0; index < ids.length; index++)
    comedyChaos.act(
      state,
      ids[index],
      { type: "comedy-answer", text: `Funny answer number ${index}` },
      now + 4_000,
    );
  comedyChaos.tick(state, ids, now + 4_001);
  const voting = comedyChaos.project(state, ids[0]) as ComedyView;
  assert.equal(voting.phase, "voting");
  assert.ok(voting.answers.every((answer) => !("authorId" in answer)));
  const own = state.answers[ids[0]].id;
  assert.throws(
    () =>
      comedyChaos.act(
        state,
        ids[0],
        { type: "comedy-vote", answerId: own, doubleDown: false },
        now + 5_000,
      ),
    /can't vote/,
  );
  const target = state.answers[ids[1]].id;
  comedyChaos.act(
    state,
    ids[0],
    { type: "comedy-vote", answerId: target, doubleDown: true },
    now + 5_000,
  );
  assert.throws(
    () =>
      comedyChaos.act(
        state,
        ids[0],
        { type: "comedy-vote", answerId: target, doubleDown: false },
        now + 5_001,
      ),
    /already locked/,
  );
  comedyChaos.act(
    state,
    ids[1],
    {
      type: "comedy-vote",
      answerId: state.answers[ids[2]].id,
      doubleDown: false,
    },
    now + 5_000,
  );
  comedyChaos.act(
    state,
    ids[2],
    { type: "comedy-vote", answerId: target, doubleDown: false },
    now + 5_000,
  );
  comedyChaos.tick(state, ids, now + 5_001);
  const results = comedyChaos.project(state, ids[0]) as ComedyView;
  assert.equal(results.phase, "vote-results");
  assert.ok(results.answers.every((answer) => answer.authorId === undefined));
  assert.ok(results.scores[ids[1]] > 0);
  comedyChaos.tick(state, ids, now + 10_000);
  const reveal = comedyChaos.project(state, ids[0]) as ComedyView;
  assert.equal(reveal.phase, "author-reveal");
  assert.ok(reveal.answers.every((answer) => Boolean(answer.authorId)));
});
