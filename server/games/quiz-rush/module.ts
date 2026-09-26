import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { GameModule } from "../module";
import type { QuizRushView } from "../../../src/games/quiz-rush/types";

const questions = [
  {
    prompt: "Which planet has the shortest day?",
    options: ["Earth", "Jupiter", "Mars", "Venus"],
    correct: 1,
  },
  {
    prompt: "What does a group of flamingos get called?",
    options: ["A sparkle", "A flamboyance", "A parade", "A blush"],
    correct: 1,
  },
  {
    prompt: "Which came first?",
    options: ["The lighter", "The match", "The telephone", "The zipper"],
    correct: 0,
  },
  {
    prompt: "How many hearts does an octopus have?",
    options: ["One", "Two", "Three", "Eight"],
    correct: 2,
  },
  {
    prompt: "What is the only mammal capable of true flight?",
    options: ["Flying squirrel", "Sugar glider", "Bat", "Colugo"],
    correct: 2,
  },
  {
    prompt: "Which color is not in a rainbow?",
    options: ["Indigo", "Pink", "Violet", "Orange"],
    correct: 1,
  },
  {
    prompt: "What is the largest desert on Earth?",
    options: ["Sahara", "Gobi", "Antarctica", "Arabian"],
    correct: 2,
  },
];
type State = QuizRushView & { questionOrder: number[] };
export const quizRushActionSchema = z.object({
  type: z.literal("answer"),
  option: z.number().int().min(0).max(3),
});
export const quizRush: GameModule<State, QuizRushView> = {
  id: "quiz-rush",
  create(players) {
    const order = questions
      .map((_, i) => i)
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
    const q = questions[order[0]];
    return {
      kind: "quiz-rush",
      runId: randomUUID(),
      playerIds: players,
      questionOrder: order,
      round: 0,
      totalRounds: 5,
      prompt: q.prompt,
      options: q.options,
      scores: Object.fromEntries(players.map((id) => [id, 0])),
      answered: [],
      lastResult: {},
      winnerIds: [],
      finished: false,
    };
  },
  act(state, playerId, raw) {
    const parsed = quizRushActionSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Choose one answer.");
    if (state.finished) throw new Error("The quiz is over.");
    if (state.answered.includes(playerId))
      throw new Error("Answer locked. Waiting for the group.");
    const correct =
      parsed.data.option ===
      questions[state.questionOrder[state.round]].correct;
    state.answered.push(playerId);
    state.lastResult[playerId] = correct;
    if (correct) state.scores[playerId]++;
    if (state.playerIds.every((id) => state.answered.includes(id))) {
      state.round++;
      if (state.round >= state.totalRounds) {
        state.finished = true;
        const high = Math.max(...Object.values(state.scores));
        state.winnerIds = state.playerIds.filter(
          (id) => state.scores[id] === high,
        );
      } else {
        const q = questions[state.questionOrder[state.round]];
        state.prompt = q.prompt;
        state.options = q.options;
        state.answered = [];
        state.lastResult = {};
      }
    }
  },
  tick() {
    return null;
  },
  finished: (state) => state.finished,
  project(state) {
    const view = structuredClone(state);
    delete (view as Partial<State>).questionOrder;
    return view;
  },
};
