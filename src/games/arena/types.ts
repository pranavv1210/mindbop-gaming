export type ArenaTeam = "ember" | "azure";
export type ArenaWeapon = "pulse" | "scatter" | "rail";
export type ArenaHero = "striker" | "warden" | "ghost" | "medic";

export type ArenaPlayer = {
  id: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  pitch: number;
  team: ArenaTeam;
  hero: ArenaHero;
  weapon: ArenaWeapon;
  hp: number;
  maxHp: number;
  kills: number;
  deaths: number;
  score: number;
  abilityReadyAt: number;
};

export type ArenaView = {
  kind: "mindbop-arena";
  runId: string;
  phase: "live";
  playerIds: string[];
  players: Record<string, ArenaPlayer>;
  zone: { x: number; z: number; radius: number; progress: number; owner: ArenaTeam | null };
  scores: Record<ArenaTeam, number>;
  timeLeft: number;
  winner: ArenaTeam | null;
  finished: boolean;
};

export type ArenaAction =
  | { type: "shoot"; weapon: ArenaWeapon; yaw: number; pitch: number }
  | { type: "ability" }
  | { type: "weapon"; weapon: ArenaWeapon }
  | { type: "hero"; hero: ArenaHero };
