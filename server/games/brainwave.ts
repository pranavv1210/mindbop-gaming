import { randomInt } from "node:crypto";
import { z } from "zod";
import type { GameModule } from "./module";

type Question = {
  text: string;
  options: string[];
  correct: number;
  explanation: string;
};
const bank: Question[] = [
  {
    text: "2, 6, 12, 20, 30… What comes next?",
    options: ["36", "40", "42", "44"],
    correct: 2,
    explanation:
      "The gaps grow by 2: +4, +6, +8, +10, then +12. So 30 + 12 = 42.",
  },
  {
    text: "You overtake the person in second place. What place are you in?",
    options: ["First", "Second", "Third", "It depends"],
    correct: 1,
    explanation:
      "You take their position. Passing second place puts you in second, not first!",
  },
  {
    text: "Which number is the odd one out?",
    options: ["9", "16", "25", "35"],
    correct: 3,
    explanation:
      "9, 16, and 25 are perfect squares. 35 is one short of 6 squared.",
  },
  {
    text: "All bloops are razzies. All razzies are lazzies. Which must be true?",
    options: [
      "All lazzies are bloops",
      "All bloops are lazzies",
      "No bloops are lazzies",
      "All razzies are bloops",
    ],
    correct: 1,
    explanation:
      "The categories nest: bloops fit inside razzies, which fit inside lazzies.",
  },
  {
    text: "A bat and a ball cost $1.10. The bat costs $1 more than the ball. How much is the ball?",
    options: ["5 cents", "10 cents", "15 cents", "20 cents"],
    correct: 0,
    explanation:
      "The ball is $0.05 and the bat is $1.05. Together they cost $1.10.",
  },
  {
    text: "How many months have at least 28 days?",
    options: ["1", "2", "11", "12"],
    correct: 3,
    explanation:
      "Every month has at least 28 days. February just makes you second-guess it.",
  },
  {
    text: "1, 1, 2, 3, 5, 8… What comes next?",
    options: ["10", "11", "13", "16"],
    correct: 2,
    explanation: "Each number adds the previous two. 5 + 8 = 13.",
  },
  {
    text: "Five machines make five toys in five minutes. How long do 100 machines need to make 100 toys?",
    options: ["1 minute", "5 minutes", "20 minutes", "100 minutes"],
    correct: 1,
    explanation:
      "Each machine makes one toy in five minutes. More machines work at the same time.",
  },
  {
    text: "Which word becomes shorter when you add two letters?",
    options: ["Small", "Tiny", "Short", "Little"],
    correct: 2,
    explanation: "Add “er” to “short” and it literally becomes “shorter”.",
  },
  {
    text: "A farmer has 17 sheep. All but 9 run away. How many remain?",
    options: ["8", "9", "17", "0"],
    correct: 1,
    explanation: "“All but 9” means that 9 did not run away.",
  },
  {
    text: "If yesterday was Thursday, what day is the day after tomorrow?",
    options: ["Saturday", "Sunday", "Monday", "Tuesday"],
    correct: 1,
    explanation:
      "Today is Friday, tomorrow is Saturday, and the next day is Sunday.",
  },
  {
    text: "Which is heavier: a kilogram of feathers or a kilogram of steel?",
    options: [
      "Feathers",
      "Steel",
      "They weigh the same",
      "Not enough information",
    ],
    correct: 2,
    explanation:
      "A kilogram is a kilogram, even if one takes up much more room.",
  },
];
export type BrainState = {
  questions: Question[];
  index: number;
  phase: "question" | "reveal" | "finished";
  deadline: number;
  answers: Record<string, number>;
};
export const brainwave: GameModule<BrainState> = {
  id: "brainwave",
  create(rounds, now) {
    const questions = [...bank];
    for (let i = questions.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    return {
      questions: questions.slice(0, rounds),
      index: 0,
      phase: "question",
      deadline: now + 20000,
      answers: {},
    };
  },
  act(state, id, action, now) {
    const parsed = z
      .object({
        type: z.literal("answer"),
        option: z.number().int().min(0).max(3),
        round: z.number().int(),
      })
      .parse(action);
    if (state.phase !== "question" || now >= state.deadline)
      throw new Error("This question has closed.");
    if (parsed.round !== state.index + 1)
      throw new Error("That answer belongs to a previous round.");
    if (id in state.answers)
      throw new Error("Your answer is already locked in.");
    state.answers[id] = parsed.option;
  },
  tick(state, players, now) {
    if (
      state.phase === "question" &&
      (now >= state.deadline ||
        (players.length > 0 && players.every((id) => id in state.answers)))
    ) {
      state.phase = "reveal";
      state.deadline = now + 6000;
      return Object.fromEntries(
        Object.entries(state.answers).map(([id, answer]) => [
          id,
          answer === state.questions[state.index].correct ? 100 : 0,
        ]),
      );
    }
    if (state.phase === "reveal" && now >= state.deadline) {
      if (state.index + 1 === state.questions.length) state.phase = "finished";
      else {
        state.index++;
        state.phase = "question";
        state.answers = {};
        state.deadline = now + 20000;
      }
    }
    return null;
  },
  finished: (state) => state.phase === "finished",
  project(state, id) {
    const q = state.questions[state.index];
    return {
      phase: state.phase,
      round: state.index + 1,
      total: state.questions.length,
      question: q.text,
      options: q.options,
      deadline: state.deadline,
      selected: state.answers[id] ?? null,
      answered: Object.keys(state.answers).length,
      ...(state.phase !== "question"
        ? { correct: q.correct, explanation: q.explanation }
        : {}),
    };
  },
};
