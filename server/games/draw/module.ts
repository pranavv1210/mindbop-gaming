import { randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import type { GameModule } from "../module";
import type {
  DrawPoint,
  DrawSettings,
  DrawView,
} from "../../../src/games/draw/types";

const EASY_WORDS = [
  "rocket",
  "pizza",
  "castle",
  "penguin",
  "rainbow",
  "telescope",
  "volcano",
  "skateboard",
  "jellyfish",
  "popcorn",
  "lighthouse",
  "spaceship",
  "watermelon",
  "backpack",
  "snowman",
  "dragon",
  "headphones",
  "campfire",
  "dinosaur",
  "cupcake",
  "umbrella",
  "treasure",
  "butterfly",
  "football",
  "cactus",
  "mermaid",
  "submarine",
  "windmill",
  "hot air balloon",
  "roller coaster",
  "detective",
  "robot",
  "guitar",
  "pancake",
  "koala",
  "mountain",
  "camera",
  "pirate",
  "toothbrush",
  "traffic light",
  "octopus",
  "ice cream",
  "basketball",
  "fireworks",
  "sandcastle",
  "helicopter",
  "wizard",
  "donut",
  "flamingo",
  "keyboard",
  "surfboard",
  "moonlight",
  "treehouse",
  "suitcase",
  "cheeseburger",
  "snowflake",
  "alarm clock",
  "invisible man",
];
const MEDIUM_WORDS = [
  "traffic jam",
  "time machine",
  "haunted house",
  "solar eclipse",
  "deep sea diver",
  "broken promise",
  "gravity",
  "daydream",
  "midnight snack",
  "secret passage",
  "awkward silence",
  "chain reaction",
  "parallel universe",
  "lost signal",
  "memory",
  "jealousy",
  "déjà vu",
  "internet outage",
  "plot twist",
  "culture shock",
  "identity crisis",
  "wild goose chase",
  "elephant in the room",
  "needle in a haystack",
  "storm in a teacup",
  "piece of cake",
  "undercover agent",
  "museum heist",
  "zero gravity",
  "northern lights",
  "emotional baggage",
  "writer's block",
];
const HARD_WORDS = [
  "existential crisis",
  "quantum entanglement",
  "the meaning of life",
  "a suspicious coincidence",
  "miscommunication",
  "imposter syndrome",
  "the passage of time",
  "unconditional love",
  "creative bankruptcy",
  "social anxiety",
  "a bad reputation",
  "reverse psychology",
  "an inside joke",
  "unfinished business",
  "a moral dilemma",
  "the butterfly effect",
  "organized chaos",
  "selective memory",
  "false confidence",
  "a guilty conscience",
  "peer pressure",
  "a second impression",
  "fear of missing out",
  "an inconvenient truth",
  "a change of heart",
  "the last straw",
  "thinking outside the box",
  "lost in translation",
  "a blessing in disguise",
  "too good to be true",
];
const WORDS = { easy: EASY_WORDS, medium: MEDIUM_WORDS, hard: HARD_WORDS };
const defaults: DrawSettings = {
  rounds: 3,
  drawTime: 80,
  chooseTime: 15,
  maxPlayers: 8,
  difficulty: "medium",
};
type State = DrawView & {
  secret: string;
  recent: string[];
  revealed: number;
  feedback: Record<string, string>;
};

export const drawActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("choose-word"),
    index: z.number().int().min(0).max(2),
  }),
  z.object({
    type: z.literal("guess"),
    text: z.string().trim().min(1).max(80),
  }),
  z.object({ type: z.literal("clear-canvas") }),
  z.object({
    type: z.literal("fill-canvas"),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
]);
export const drawPointSchema = z.object({
  id: z.string().min(1).max(48),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  size: z.number().min(1).max(64),
  erase: z.boolean(),
  start: z.boolean(),
  opacity: z.number().min(0.1).max(1).optional(),
  fill: z.boolean().optional(),
});

function hiddenWord(word: string) {
  return [...word].map((c) => (c === " " ? "  " : "_")).join(" ");
}
function hintFor(word: string, reveals: number) {
  const chars = [...word];
  const letters = chars
    .map((c, i) => (/[a-z]/i.test(c) ? i : -1))
    .filter((i) => i >= 0);
  const visible = new Set<number>();
  for (let n = 0; n < Math.min(reveals, letters.length); n++)
    visible.add(letters[(n * 7 + word.length * 3) % letters.length]);
  return chars
    .map((c, i) => (c === " " ? "  " : visible.has(i) ? c : "_"))
    .join(" ");
}
function pickChoices(state: State) {
  const words = WORDS[state.settings.difficulty];
  const pool = words.filter((word) => !state.recent.includes(word));
  const out: string[] = [];
  while (out.length < 3) {
    const source = pool.length ? pool : words;
    const word = source[randomInt(source.length)];
    if (!out.includes(word)) out.push(word);
  }
  state.choices = out;
  state.secret = "";
  state.word = "";
  state.hint = "";
}
function distance(a: string, b: string) {
  const left = [...a.toLowerCase()],
    right = [...b.toLowerCase()],
    row = right.map((_, index) => index + 1);
  for (let i = 0; i < left.length; i++) {
    let diagonal = i;
    row[0] = i + 1;
    for (let j = 0; j < right.length; j++) {
      const prior = row[j + 1];
      row[j + 1] =
        left[i] === right[j]
          ? diagonal
          : Math.min(diagonal, row[j], row[j + 1]) + 1;
      diagonal = prior;
    }
  }
  return row[right.length] ?? left.length;
}
function begin(state: State, index: number, now: number, automatic = false) {
  const word = state.choices?.[index] ?? state.choices?.[randomInt(3)];
  if (!word) return;
  state.secret = word;
  state.word = word;
  state.hint = hiddenWord(word);
  state.revealed = 0;
  state.recent = [...state.recent.slice(-18), word];
  state.choices = undefined;
  state.phase = "drawing";
  state.deadline = now + state.settings.drawTime * 1000;
  state.messages.push({
    id: randomUUID(),
    text: automatic
      ? "Time's up — a word was picked automatically."
      : "The word is locked in. Draw!",
    kind: "system",
    at: now,
  });
}
function finishTurn(state: State, now: number) {
  if (state.phase === "round-end" || state.finished) return;
  state.phase = "round-end";
  state.lastWord = state.secret;
  state.lastScores = { ...state.scores };
  state.deadline = now + 4500;
  state.messages.push({
    id: randomUUID(),
    text: `The word was ${state.secret}.`,
    kind: "system",
    at: now,
  });
}
function nextTurn(state: State, now: number) {
  const next = state.turn + 1;
  if (next >= state.playerIds.length * state.totalRounds) {
    state.phase = "finished";
    state.finished = true;
    const high = Math.max(...Object.values(state.scores));
    state.winnerIds = state.playerIds.filter((id) => state.scores[id] === high);
    state.deadline = now;
    return;
  }
  state.turn = next;
  state.round = Math.floor(next / state.playerIds.length) + 1;
  state.drawerId = state.playerIds[next % state.playerIds.length];
  state.phase = "choosing";
  state.deadline = now + state.settings.chooseTime * 1000;
  state.strokes = [];
  state.canvasVersion++;
  state.guessed = [];
  state.feedback = {};
  state.lastWord = undefined;
  pickChoices(state);
}

export const mindbopDraw: GameModule<State, DrawView> = {
  id: "mindbop-draw",
  create(players, now, input) {
    const settings = {
      ...defaults,
      ...(input as Partial<DrawSettings> | undefined),
    };
    const state: State = {
      kind: "mindbop-draw",
      runId: randomUUID(),
      phase: "choosing",
      playerIds: players,
      drawerId: players[0],
      round: 1,
      totalRounds: settings.rounds,
      turn: 0,
      deadline: now + settings.chooseTime * 1000,
      settings,
      choices: [],
      word: "",
      hint: "",
      strokes: [],
      canvasVersion: 0,
      messages: [
        {
          id: randomUUID(),
          text: "Choose a word to start the round.",
          kind: "system",
          at: now,
        },
      ],
      scores: Object.fromEntries(players.map((id) => [id, 0])),
      guessed: [],
      winnerIds: [],
      finished: false,
      secret: "",
      recent: [],
      revealed: 0,
      feedback: {},
    };
    pickChoices(state);
    return state;
  },
  act(state, playerId, raw, now) {
    const parsed = drawActionSchema.safeParse(raw);
    if (!parsed.success) throw new Error("That game action is not valid.");
    const action = parsed.data;
    if (action.type === "choose-word") {
      if (state.phase !== "choosing" || playerId !== state.drawerId)
        throw new Error("Only the current artist can choose a word.");
      if (now >= state.deadline) throw new Error("Word selection has ended.");
      begin(state, action.index, now);
      return;
    }
    if (action.type === "clear-canvas") {
      if (state.phase !== "drawing" || playerId !== state.drawerId)
        throw new Error("Only the current artist can clear the canvas.");
      state.strokes = [];
      state.canvasVersion++;
      return;
    }
    if (action.type === "fill-canvas") {
      if (state.phase !== "drawing" || playerId !== state.drawerId)
        throw new Error("Only the current artist can fill the canvas.");
      state.strokes.push({
        id: randomUUID(),
        x: 0,
        y: 0,
        color: action.color,
        size: 1,
        erase: false,
        start: true,
        opacity: 1,
        fill: true,
      });
      state.canvasVersion++;
      return;
    }
    if (state.phase !== "drawing")
      throw new Error("Guesses are closed right now.");
    if (playerId === state.drawerId)
      throw new Error("The artist can't guess their own word.");
    const clean = action.text.trim().replace(/\s+/g, " ");
    const correct = clean.toLowerCase() === state.secret.toLowerCase();
    if (correct) {
      if (state.guessed.includes(playerId))
        throw new Error("You already guessed it.");
      const remaining = Math.max(0, state.deadline - now);
      const points = Math.max(
        100,
        Math.round((500 * remaining) / (state.settings.drawTime * 1000)),
      );
      state.scores[playerId] += points;
      state.scores[state.drawerId] += 75;
      state.guessed.push(playerId);
      state.feedback[playerId] = "Correct — you got it!";
      state.messages.push({
        id: randomUUID(),
        playerId,
        text: "guessed it!",
        kind: "correct",
        at: now,
      });
      const guessers = state.playerIds.filter((id) => id !== state.drawerId);
      if (guessers.every((id) => state.guessed.includes(id)))
        finishTurn(state, now);
    } else {
      const normalized = clean.toLowerCase();
      const secret = state.secret.toLowerCase();
      const close =
        normalized.length >= 3 &&
        (secret.includes(normalized) ||
          normalized.includes(secret) ||
          distance(normalized, secret) <=
            Math.max(1, Math.floor(secret.length * 0.25)));
      state.feedback[playerId] = close ? "Very close — keep guessing!" : "";
      state.messages.push({
        id: randomUUID(),
        playerId,
        text: clean,
        kind: "chat",
        at: now,
      });
    }
    state.messages = state.messages.slice(-60);
  },
  tick(state, players, now) {
    if (!players.includes(state.drawerId) && state.phase !== "finished")
      finishTurn(state, now);
    if (state.phase === "choosing" && now >= state.deadline)
      begin(state, randomInt(3), now, true);
    else if (state.phase === "drawing") {
      const elapsed = state.settings.drawTime * 1000 - (state.deadline - now);
      const target =
        elapsed >= state.settings.drawTime * 750
          ? 2
          : elapsed >= state.settings.drawTime * 450
            ? 1
            : 0;
      if (target > state.revealed) {
        state.revealed = target;
        state.hint = hintFor(state.secret, target);
        state.messages.push({
          id: randomUUID(),
          text: `Hint ${target}: a letter was revealed.`,
          kind: "system",
          at: now,
        });
      }
      if (now >= state.deadline) finishTurn(state, now);
    } else if (state.phase === "round-end" && now >= state.deadline)
      nextTurn(state, now);
    return null;
  },
  finished: (state) => state.finished,
  project(state, playerId) {
    const view = structuredClone(state) as Partial<State> & DrawView;
    if (playerId !== state.drawerId || state.phase !== "choosing")
      delete view.choices;
    view.word =
      playerId === state.drawerId ||
      state.phase === "round-end" ||
      state.phase === "finished"
        ? state.secret
        : "";
    delete view.secret;
    delete view.recent;
    delete view.revealed;
    view.guessFeedback = state.feedback[playerId];
    delete view.feedback;
    return view;
  },
};

export function addDrawPoints(state: unknown, playerId: string, raw: unknown) {
  const parsed = z.array(drawPointSchema).min(1).max(32).safeParse(raw);
  const game = state as State;
  if (
    !parsed.success ||
    game.kind !== "mindbop-draw" ||
    game.phase !== "drawing" ||
    game.drawerId !== playerId
  )
    return [];
  const points = parsed.data as DrawPoint[];
  game.strokes.push(...points);
  if (game.strokes.length > 5000) game.strokes.splice(0, 1000);
  return points;
}
