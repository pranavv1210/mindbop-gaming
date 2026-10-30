// Shared (browser + server) constants for MindBop Arena. No DOM or Node imports here.

export const TICK_RATE = 30;
export const TICK_MS = 1000 / TICK_RATE;
export const DT = 1 / TICK_RATE;
/** Physics substeps per tick. Client prediction and the server both use exactly this. */
export const SUBSTEPS = 2;

export const MAX_PLAYERS_PER_ROOM = 12;
export const MIN_PLAYERS_TO_START = 2;
export const COUNTDOWN_TICKS = 8 * TICK_RATE;
export const MATCH_TICKS = 5 * 60 * TICK_RATE;
export const END_TICKS = 12 * TICK_RATE;
export const KILL_LIMIT = 30;
export const RESPAWN_TICKS = 3 * TICK_RATE;
export const SPAWN_PROTECT_TICKS = 2 * TICK_RATE;
export const DISCONNECT_GRACE_TICKS = 15 * TICK_RATE;
export const EMPTY_ROOM_TTL_TICKS = 20 * TICK_RATE;

/** Body: a vertical box for movement, cylinder + head sphere for hit tests. */
export const BODY_HEIGHT = 1.8;
export const RADIUS = 0.4;
export const EYE_HEIGHT = 1.6;
export const STEP_HEIGHT = 0.6;
export const GRAVITY = 24;
export const JUMP_SPEED = 7.6;
export const GROUND_ACCEL = 70;
export const GROUND_DECEL = 55;
export const AIR_ACCEL = 20;
export const SPRINT_MUL = 1.28;
export const ADS_SPEED_MUL = 0.72;

export const HIT_BODY_RADIUS = 0.42;
export const HIT_BODY_TOP = 1.4;
export const HIT_HEAD_RADIUS = 0.25;
export const HIT_HEAD_CENTER = 1.62;

/** Lag compensation: the server never rewinds other players further than this. */
export const MAX_REWIND_TICKS = 10;
export const HISTORY_TICKS = 32;
/** The client renders remote players this many ticks behind the newest snapshot. */
export const INTERP_TICKS = 3;
/** Input queue limits (per player) so a burst of commands cannot speed-hack. */
export const MAX_QUEUED_CMDS = 6;
export const MAX_REPEAT_TICKS = 4;

export const HEROES = {
  striker: { index: 0, label: "Striker", detail: "Dash · agile", maxHp: 100, speed: 8.4, abilityCooldownTicks: 6 * TICK_RATE },
  warden: { index: 1, label: "Warden", detail: "Barrier · tank", maxHp: 140, speed: 7.0, abilityCooldownTicks: 12 * TICK_RATE },
  ghost: { index: 2, label: "Ghost", detail: "Cloak · speed", maxHp: 85, speed: 9.2, abilityCooldownTicks: 14 * TICK_RATE },
  medic: { index: 3, label: "Medic", detail: "Heal pulse · support", maxHp: 110, speed: 7.8, abilityCooldownTicks: 10 * TICK_RATE },
} as const;
export type HeroId = keyof typeof HEROES;
export const HERO_IDS = Object.keys(HEROES) as HeroId[];

export const ABILITY = {
  dashSpeed: 22,
  dashLockTicks: 6,
  barrierTicks: 3 * TICK_RATE,
  barrierDamageMul: 0.4,
  cloakTicks: 4 * TICK_RATE,
  healAmount: 40,
  healRadius: 8,
} as const;

export const WEAPONS = {
  pulse: { index: 0, label: "Pulse Rifle", hint: "balanced", damage: 18, intervalMs: 100, mag: 30, reloadMs: 1800, range: 70, spreadHip: 0.014, spreadAds: 0.004, pellets: 1, headshot: 1.6, auto: true, falloffStart: 30, falloffMin: 0.6, zoom: 1.3 },
  scatter: { index: 1, label: "Scatter", hint: "close range", damage: 9, intervalMs: 720, mag: 6, reloadMs: 2300, range: 26, spreadHip: 0.075, spreadAds: 0.05, pellets: 8, headshot: 1.3, auto: false, falloffStart: 6, falloffMin: 0.35, zoom: 1.1 },
  rail: { index: 2, label: "Rail", hint: "precision", damage: 85, intervalMs: 1100, mag: 4, reloadMs: 2500, range: 140, spreadHip: 0.05, spreadAds: 0, pellets: 1, headshot: 1.5, auto: false, falloffStart: 140, falloffMin: 1, zoom: 3 },
  arc: { index: 3, label: "Arc SMG", hint: "rapid fire", damage: 11, intervalMs: 62, mag: 40, reloadMs: 1600, range: 40, spreadHip: 0.03, spreadAds: 0.012, pellets: 1, headshot: 1.4, auto: true, falloffStart: 14, falloffMin: 0.5, zoom: 1.2 },
} as const;
export type WeaponId = keyof typeof WEAPONS;
export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
export const WEAPON_SWITCH_TICKS = 10;

export const ticksFromMs = (ms: number) => Math.max(1, Math.round(ms / TICK_MS));
export const msFromTicks = (ticks: number) => Math.round(ticks * TICK_MS);

export const TEAM_NAMES = ["ember", "azure"] as const;
export type TeamIndex = 0 | 1;
export type Phase = "waiting" | "countdown" | "live" | "ended";
export const PHASES: Phase[] = ["waiting", "countdown", "live", "ended"];

/** Button bits used by the input command. */
export const BTN = { jump: 1, sprint: 2, fire: 4, ability: 8, reload: 16, ads: 32 } as const;
