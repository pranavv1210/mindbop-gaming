import { lastGuest } from "./last-guest/module";
import type { GameModule } from "./module";
export const modules = new Map<string, GameModule>([
  [lastGuest.id, lastGuest as GameModule],
]);
