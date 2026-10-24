import { mindbopDraw } from "./draw/module";
import { lastGuest } from "./last-guest/module";
import { fourRow } from "./four-row/module";
import { wordChain } from "./word-chain/module";
import { quizRush } from "./quiz-rush/module";
import type { GameModule } from "./module";
import { mafia } from "./mafia/module";
import { twoTruths } from "./two-truths/module";
import { skyScramble } from "./sky-scramble/module";
import { comedyChaos } from "./comedy-chaos/module";
export const modules = new Map<string, GameModule>([
  [mindbopDraw.id, mindbopDraw as GameModule],
  [lastGuest.id, lastGuest as GameModule],
  [fourRow.id, fourRow as GameModule],
  [wordChain.id, wordChain as GameModule],
  [quizRush.id, quizRush as GameModule],
  [mafia.id, mafia as GameModule],
  [twoTruths.id, twoTruths as GameModule],
  [skyScramble.id, skyScramble as GameModule],
  [comedyChaos.id, comedyChaos as GameModule],
]);
