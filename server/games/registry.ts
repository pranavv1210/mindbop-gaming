import { lastGuest } from "./last-guest/module";
import { fourRow } from "./four-row/module";
import { wordChain } from "./word-chain/module";
import { quizRush } from "./quiz-rush/module";
import type { GameModule } from "./module";
export const modules = new Map<string, GameModule>([
  [lastGuest.id, lastGuest as GameModule],
  [fourRow.id, fourRow as GameModule],
  [wordChain.id, wordChain as GameModule],
  [quizRush.id, quizRush as GameModule],
]);
