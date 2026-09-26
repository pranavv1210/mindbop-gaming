import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { GameModule } from "../module";
import type { WordChainView } from "../../../src/games/word-chain/types";

export const wordChainActionSchema = z.object({
  type: z.literal("word"),
  word: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{3,18}$/),
});
export const wordChain: GameModule<WordChainView, WordChainView> = {
  id: "word-chain",
  create(players) {
    return {
      kind: "word-chain",
      runId: randomUUID(),
      playerIds: players,
      turn: players[0],
      currentLetter: "s",
      words: [],
      scores: Object.fromEntries(players.map((id) => [id, 0])),
      winner: null,
    };
  },
  act(state, playerId, raw) {
    const parsed = wordChainActionSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Use one word with 3–18 letters.");
    if (state.winner) throw new Error("This round is over.");
    if (state.turn !== playerId) throw new Error("Wait for your turn.");
    const word = parsed.data.word;
    if (state.words.some((entry) => entry.word === word))
      throw new Error("That word has already been played.");
    if (!word.startsWith(state.currentLetter))
      throw new Error(
        `Your word must start with ${state.currentLetter.toUpperCase()}.`,
      );
    state.words.push({ word, by: playerId });
    state.scores[playerId]++;
    state.currentLetter = word.at(-1)!;
    if (state.scores[playerId] >= 5) state.winner = playerId;
    else
      state.turn =
        state.playerIds[
          (state.playerIds.indexOf(playerId) + 1) % state.playerIds.length
        ];
  },
  tick() {
    return null;
  },
  finished: (state) => Boolean(state.winner),
  project: (state) => structuredClone(state),
};
