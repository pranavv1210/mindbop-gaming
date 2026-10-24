import { randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import type { GameModule } from "../module";
import type {
  ComedyAction,
  ComedyPhase,
  ComedySettings,
  ComedyView,
} from "../../../src/games/comedy-chaos/types";
import { COMEDY_PROMPTS, type ComedyPrompt } from "./prompts";

const answer = z
  .string()
  .trim()
  .min(1)
  .max(150)
  .transform((value) => value.replace(/\s+/g, " "));
export const comedyActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("comedy-answer"), text: answer }),
  z.object({
    type: z.literal("comedy-vote"),
    answerId: z.string().uuid(),
    doubleDown: z.boolean(),
  }),
  z.object({
    type: z.literal("comedy-guess"),
    answerId: z.string().uuid(),
    playerId: z.string().uuid(),
  }),
  z.object({ type: z.literal("comedy-skip-phase") }),
]);
type SecretAnswer = {
  id: string;
  text: string;
  authorId: string;
  fallback: boolean;
};
type Vote = { answerId: string; weight: 1 | 2 };
type State = {
  kind: "comedy-chaos";
  runId: string;
  phase: ComedyPhase;
  round: number;
  settings: ComedySettings;
  deadline: number;
  playerIds: string[];
  prompt: ComedyPrompt;
  promptHistory: string[];
  answers: Record<string, SecretAnswer>;
  order: string[];
  assignments: Record<string, string>;
  votes: Record<string, Vote>;
  guesses: Record<string, { answerId: string; playerId: string }>;
  doubleUsed: Record<string, boolean>;
  scores: Record<string, number>;
  roundGains: Record<string, number>;
  totalVotes: Record<string, number>;
  correctGuesses: Record<string, number>;
  winnerIds: string[];
  awards: { title: string; playerId: string }[];
  finished: boolean;
};
const defaults: ComedySettings = {
  rounds: 5,
  answerTime: 30,
  votingTime: 15,
  doubleDown: true,
  authorGuessing: true,
  performanceMode: true,
  maxPlayers: 20,
};
function shuffle<T>(values: T[]) {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function choosePrompt(history: string[]) {
  const pool = COMEDY_PROMPTS.filter(
    (p) => p.active && !history.includes(p.id),
  );
  return (
    pool[randomInt(pool.length || COMEDY_PROMPTS.length)] ?? COMEDY_PROMPTS[0]
  );
}
function moderate(text: string) {
  if (
    /(.)\1{11,}/iu.test(text) ||
    /(https?:\/\/|<script|\b(?:kill yourself|n[i1]gg[e3]r|f[a@]gg[o0]t)\b)/iu.test(
      text,
    )
  )
    throw new Error("That answer can't be submitted. Try something else.");
}
function prepare(state: State, now: number) {
  for (const id of state.playerIds)
    if (!state.answers[id])
      state.answers[id] = {
        id: randomUUID(),
        text: "I refuse to answer on legal advice.",
        authorId: id,
        fallback: true,
      };
  state.order = shuffle(Object.values(state.answers).map((a) => a.id));
  const shifted = [...state.playerIds.slice(1), state.playerIds[0]];
  state.assignments = Object.fromEntries(
    state.playerIds.map((id, index) => [id, state.answers[shifted[index]].id]),
  );
  state.phase = state.settings.performanceMode ? "performance" : "voting";
  state.deadline =
    now +
    (state.settings.performanceMode ? 7000 : state.settings.votingTime * 1000);
}
function score(state: State, now: number) {
  const counts: Record<string, number> = {};
  for (const vote of Object.values(state.votes))
    counts[vote.answerId] = (counts[vote.answerId] ?? 0) + vote.weight;
  const values = Object.values(counts);
  const first = Math.max(0, ...values),
    second = Math.max(0, ...values.filter((v) => v < first));
  state.roundGains = Object.fromEntries(state.playerIds.map((id) => [id, 0]));
  for (const item of Object.values(state.answers)) {
    const votePoints = counts[item.id] ?? 0;
    const bonus =
      votePoints === first && first > 0
        ? 2
        : votePoints === second && second > 0
          ? 1
          : 0;
    const gain = item.fallback ? 0 : votePoints + bonus;
    state.roundGains[item.authorId] += gain;
    state.totalVotes[item.authorId] += votePoints;
  }
  for (const guess of Object.values(state.guesses)) {
    const item = Object.values(state.answers).find(
      (a) => a.id === guess.answerId,
    );
    if (item?.authorId === guess.playerId) {
      state.roundGains[
        Object.keys(state.guesses).find((id) => state.guesses[id] === guess)!
      ] += 1;
    }
  }
  for (const id of state.playerIds) state.scores[id] += state.roundGains[id];
  state.phase = "vote-results";
  state.deadline = now + 4500;
}
function nextRound(state: State, now: number) {
  if (state.round >= state.settings.rounds) {
    state.finished = true;
    state.phase = "finished";
    const high = Math.max(...Object.values(state.scores));
    state.winnerIds = state.playerIds.filter((id) => state.scores[id] === high);
    const funniest = [...state.playerIds].sort(
      (a, b) => state.totalVotes[b] - state.totalVotes[a],
    )[0];
    const detective = [...state.playerIds].sort(
      (a, b) => state.correctGuesses[b] - state.correctGuesses[a],
    )[0];
    state.awards = [
      { title: "Funniest Human", playerId: funniest },
      { title: "Human Lie Detector", playerId: detective },
    ];
    return;
  }
  state.round++;
  state.prompt = choosePrompt(state.promptHistory);
  state.promptHistory.push(state.prompt.id);
  state.answers = {};
  state.order = [];
  state.assignments = {};
  state.votes = {};
  state.guesses = {};
  state.roundGains = {};
  state.phase = "prompt";
  state.deadline = now + 3000;
}
export const comedyChaos: GameModule<State, ComedyView> = {
  id: "comedy-chaos",
  create(players, now, raw) {
    if (players.length < 3 || players.length > 20)
      throw new Error("Comedy Chaos needs 3–20 players.");
    const settings = { ...defaults, ...(raw as Partial<ComedySettings>) };
    const prompt = choosePrompt([]);
    return {
      kind: "comedy-chaos",
      runId: randomUUID(),
      phase: "prompt",
      round: 1,
      settings,
      deadline: now + 3000,
      playerIds: players,
      prompt,
      promptHistory: [prompt.id],
      answers: {},
      order: [],
      assignments: {},
      votes: {},
      guesses: {},
      doubleUsed: {},
      scores: Object.fromEntries(players.map((id) => [id, 0])),
      roundGains: {},
      totalVotes: Object.fromEntries(players.map((id) => [id, 0])),
      correctGuesses: Object.fromEntries(players.map((id) => [id, 0])),
      winnerIds: [],
      awards: [],
      finished: false,
    };
  },
  act(state, playerId, raw, now) {
    const parsed = comedyActionSchema.safeParse(raw);
    if (!parsed.success) throw new Error("That action isn't valid.");
    const action = parsed.data as ComedyAction;
    if (!state.playerIds.includes(playerId))
      throw new Error("You are not in this game.");
    if (action.type === "comedy-answer") {
      if (state.phase !== "answering" || now >= state.deadline)
        throw new Error("Answering is closed.");
      if (state.answers[playerId])
        throw new Error("Your answer is already locked.");
      moderate(action.text);
      state.answers[playerId] = {
        id: randomUUID(),
        text: action.text,
        authorId: playerId,
        fallback: false,
      };
      return;
    }
    if (action.type === "comedy-vote") {
      if (
        state.phase !== "voting" ||
        now >= state.deadline ||
        state.votes[playerId]
      )
        throw new Error("Your vote is already locked or voting has closed.");
      const item = Object.values(state.answers).find(
        (a) => a.id === action.answerId,
      );
      if (!item || item.authorId === playerId)
        throw new Error("You can't vote for this answer.");
      if (
        action.doubleDown &&
        (!state.settings.doubleDown || state.doubleUsed[playerId])
      )
        throw new Error("Double Down is unavailable.");
      state.votes[playerId] = {
        answerId: item.id,
        weight: action.doubleDown ? 2 : 1,
      };
      if (action.doubleDown) state.doubleUsed[playerId] = true;
      return;
    }
    if (action.type === "comedy-guess") {
      if (
        state.phase !== "guessing" ||
        state.guesses[playerId] ||
        action.playerId === playerId
      )
        throw new Error("That author guess isn't available.");
      const item = Object.values(state.answers).find(
        (a) => a.id === action.answerId,
      );
      if (!item || !state.playerIds.includes(action.playerId))
        throw new Error("That author guess isn't available.");
      state.guesses[playerId] = {
        answerId: item.id,
        playerId: action.playerId,
      };
      if (item.authorId === action.playerId) state.correctGuesses[playerId]++;
      return;
    }
    throw new Error("The host controls round timing.");
  },
  tick(state, connected, now) {
    if (state.finished) return null;
    const all = (record: Record<string, unknown>) =>
      state.playerIds
        .filter((id) => connected.includes(id))
        .every((id) => record[id] !== undefined);
    if (state.phase === "prompt" && now >= state.deadline) {
      state.phase = "answering";
      state.deadline = now + state.settings.answerTime * 1000;
    } else if (
      state.phase === "answering" &&
      (now >= state.deadline || all(state.answers))
    )
      prepare(state, now);
    else if (state.phase === "performance" && now >= state.deadline) {
      state.phase = "voting";
      state.deadline = now + state.settings.votingTime * 1000;
    } else if (
      state.phase === "voting" &&
      (now >= state.deadline || all(state.votes))
    ) {
      if (state.settings.authorGuessing) {
        state.phase = "guessing";
        state.deadline = now + 10000;
      } else score(state, now);
    } else if (
      state.phase === "guessing" &&
      (now >= state.deadline || all(state.guesses))
    )
      score(state, now);
    else if (state.phase === "vote-results" && now >= state.deadline) {
      state.phase = "author-reveal";
      state.deadline = now + 6000;
    } else if (state.phase === "author-reveal" && now >= state.deadline) {
      state.phase = "round-results";
      state.deadline = now + 5000;
    } else if (state.phase === "round-results" && now >= state.deadline)
      nextRound(state, now);
    return null;
  },
  finished: (s) => s.finished,
  project(state, playerId) {
    const reveal =
      state.phase === "author-reveal" ||
      state.phase === "round-results" ||
      state.phase === "finished";
    const counts: Record<string, number> = {};
    for (const vote of Object.values(state.votes))
      counts[vote.answerId] = (counts[vote.answerId] ?? 0) + vote.weight;
    return {
      kind: "comedy-chaos",
      runId: state.runId,
      phase: state.phase,
      round: state.round,
      totalRounds: state.settings.rounds,
      deadline: state.deadline,
      prompt: state.prompt,
      answers: state.order.map((id) => {
        const item = Object.values(state.answers).find((a) => a.id === id)!;
        return {
          id: item.id,
          text: item.text,
          ...(state.phase === "vote-results" || reveal
            ? { votes: counts[item.id] ?? 0 }
            : {}),
          ...(reveal
            ? {
                authorId: item.authorId,
                points: state.roundGains[item.authorId],
              }
            : {}),
        };
      }),
      submittedIds: Object.keys(state.answers),
      voteLocked: Boolean(state.votes[playerId]),
      guessLocked: Boolean(state.guesses[playerId]),
      doubleDownAvailable:
        state.settings.doubleDown && !state.doubleUsed[playerId],
      assignedAnswer: state.assignments[playerId]
        ? (() => {
            const item = Object.values(state.answers).find(
              (a) => a.id === state.assignments[playerId],
            )!;
            return { id: item.id, text: item.text };
          })()
        : undefined,
      scores: state.scores,
      roundGains: state.roundGains,
      winnerIds: state.winnerIds,
      awards: state.awards,
      finished: state.finished,
    };
  },
};
