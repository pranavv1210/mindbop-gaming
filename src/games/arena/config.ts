export const ARENA_MAPS = [
  { id: "neon-yard", name: "Neon Yard", zoneSpots: [[0, 0], [9, 6], [-8, 7], [6, -9]] as const },
  { id: "skyline", name: "Skyline Relay", zoneSpots: [[0, 0], [-10, 5], [8, 8], [7, -7]] as const },
  { id: "reactor", name: "Reactor Core", zoneSpots: [[0, 0], [7, 9], [-9, -6], [8, -8]] as const },
] as const;

export const ARENA_WEAPONS = {
  pulse: { damage: 20, cooldown: 140, range: 55, spread: 0.035, pellets: 1, headshot: 1.45 },
  scatter: { damage: 11, cooldown: 560, range: 24, spread: 0.19, pellets: 7, headshot: 1.25 },
  rail: { damage: 68, cooldown: 950, range: 90, spread: 0.006, pellets: 1, headshot: 1.8 },
} as const;

export const ARENA_HEROES = {
  striker: { maxHp: 100, speed: 9.5, abilityCooldown: 7000 },
  warden: { maxHp: 135, speed: 7.5, abilityCooldown: 9000 },
  ghost: { maxHp: 85, speed: 10.5, abilityCooldown: 8500 },
  medic: { maxHp: 105, speed: 8.8, abilityCooldown: 7500 },
} as const;

export const ARENA_LIMITS = {
  minPlayers: 2,
  maxPlayers: 10,
  matchSeconds: 480,
  tickClampSeconds: 0.05,
  historyMs: 1200,
  maxRewindMs: 1000,
  spawnProtectionMs: 1800,
  zoneCycleMs: 60000,
  capturePerSecond: 12,
  scoreToWin: 100,
} as const;
