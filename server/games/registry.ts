import { brainwave } from "./brainwave";
import type { GameModule } from "./module";
// State is opaque to the room engine; each registered module owns its validation and projection.
export const modules = new Map<string, GameModule>([
  [brainwave.id, brainwave as GameModule],
]);
