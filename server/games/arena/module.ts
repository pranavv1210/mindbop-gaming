import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { GameModule } from "../module";
import type { ArenaAction, ArenaCardId, ArenaHero, ArenaPlayer, ArenaTeam, ArenaView, ArenaWeapon } from "../../../src/games/arena/types";
import { ARENA_CARDS, ARENA_HEROES, ARENA_LIMITS, ARENA_MAPS, ARENA_WEAPONS } from "../../../src/games/arena/config";

export const arenaActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("shoot"), weapon: z.enum(["pulse", "scatter", "rail"]), yaw: z.number().finite(), pitch: z.number().finite(), shotAt: z.number().finite() }),
  z.object({ type: z.literal("ability") }),
  z.object({ type: z.literal("weapon"), weapon: z.enum(["pulse", "scatter", "rail"]) }),
  z.object({ type: z.literal("hero"), hero: z.enum(["striker", "warden", "ghost", "medic"]) }),
  z.object({ type: z.literal("card"), card: z.enum(["overclock", "bulwark", "ghoststep", "sharpshot"]) }),
]);

const spawnPoints = [
  { x: -18, z: -14 }, { x: 18, z: 14 }, { x: -18, z: 14 }, { x: 18, z: -14 },
] as const;

type Body = ArenaPlayer;
type ArenaState = ArenaView["game"];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const distance = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
const forward = (yaw: number, pitch: number) => {
  const cp = Math.cos(pitch);
  return { x: Math.sin(yaw) * cp, y: Math.sin(pitch), z: Math.cos(yaw) * cp };
};

function createPlayer(id: string, team: ArenaTeam, now: number): ArenaPlayer {
  return {
    id,
    team,
    x: spawnPoints[id.length % spawnPoints.length].x,
    y: 1,
    z: spawnPoints[id.length % spawnPoints.length].z,
    yaw: 0,
    pitch: 0,
    vx: 0,
    vz: 0,
    hp: 100,
    maxHp: 100,
    stamina: 100,
    weapon: "pulse",
    hero: "striker",
    nextShotAt: now,
    abilityReadyAt: now,
    shieldUntil: 0,
    cloakedUntil: 0,
    respawnAt: 0,
    spawnProtectedUntil: now + ARENA_LIMITS.spawnProtectionMs,
    kills: 0,
    deaths: 0,
    score: 0,
    pendingCards: [],
    cards: [],
  };
}

function fireCooldown(player: ArenaPlayer, base: number) {
  const overclock = player.cards.includes("overclock") ? 0.88 : 1;
  return base * overclock;
}

function damageMultiplier(player: ArenaPlayer) {
  return player.cards.includes("sharpshot") ? 1.1 : 1;
}

function maxHp(player: ArenaPlayer) {
  return player.cards.includes("bulwark") ? 125 : 100;
}

function speed(player: ArenaPlayer) {
  const base = ARENA_HEROES[player.hero].speed;
  return base * (player.cards.includes("ghoststep") ? 1.1 : 1);
}

function damageTarget(shooter: ArenaPlayer, target: ArenaPlayer, base: number, now: number, headshot: boolean) {
  const weaponMultiplier = damageMultiplier(shooter);
  const multiplier = headshot ? (shooter.weapon === "pulse" ? ARENA_WEAPONS.pulse.headshot : shooter.weapon === "rail" ? ARENA_WEAPONS.rail.headshot : ARENA_WEAPONS.scatter.headshot) : 1;
  const shielded = target.shieldUntil > now;
  const damage = Math.round(base * weaponMultiplier * multiplier * (shielded ? 0.55 : 1));
  target.hp = Math.max(0, target.hp - damage);
  if (target.hp <= 0) {
    shooter.kills += 1;
    shooter.score += 100;
    target.deaths += 1;
    target.respawnAt = now + 3000;
    target.hp = 0;
    target.vx = 0;
    target.vz = 0;
  }
}

function historical(player: ArenaPlayer, shotAt: number) {
  let best = player.history?.[0];
  if (!best) return { x: player.x, y: player.y, z: player.z };
  for (const sample of player.history ?? []) {
    if (Math.abs(sample.t - shotAt) < Math.abs(best.t - shotAt)) best = sample;
  }
  return { x: best.x, y: best.y, z: best.z };
}

export const arena: GameModule = {
  id: "arena",
  create(now) {
    return {
      kind: "arena",
      runId: randomUUID(),
      mapId: ARENA_MAPS[Math.floor(Math.random() * ARENA_MAPS.length)].id,
      phase: "lobby",
      timeLeft: ARENA_LIMITS.matchSeconds,
      scores: { ember: 0, azure: 0 },
      zone: { x: 0, z: 0, progress: 0, owner: null },
      zoneCycleAt: now + ARENA_LIMITS.zoneCycleMs,
      captureCount: 0,
      finished: false,
      winner: null,
      players: {},
      playerIds: [],
      lastTick: now,
    } as ArenaState;
  },
  join(state, id, now) {
    const team: ArenaTeam = state.playerIds.filter((playerId) => state.players[playerId]?.team === "ember").length <= state.playerIds.filter((playerId) => state.players[playerId]?.team === "azure").length ? "ember" : "azure";
    state.players[id] = createPlayer(id, team, now);
    state.playerIds.push(id);
    return state.players[id];
  },
  leave(state, id) {
    delete state.players[id];
    state.playerIds = state.playerIds.filter((playerId) => playerId !== id);
    return state;
  },
  command(state, playerId, input, now) {
    const p = state.players[playerId];
    if (!p) return;
    if (input.type === "hero" && input.hero in ARENA_HEROES) {
      p.hero = input.hero as ArenaHero;
      p.maxHp = ARENA_HEROES[p.hero].maxHp;
      p.hp = p.maxHp;
    }
    if (input.type === "weapon" && input.weapon in ARENA_WEAPONS) p.weapon = input.weapon as ArenaWeapon;
    if (input.type === "ability" && now >= p.abilityReadyAt && p.respawnAt <= now) {
      p.abilityReadyAt = now + ARENA_HEROES[p.hero].abilityCooldown;
      if (p.hero === "striker") {
        p.vx += Math.sin(p.yaw) * 8;
        p.vz += Math.cos(p.yaw) * 8;
      } else if (p.hero === "warden") p.shieldUntil = now + 2500;
      else if (p.hero === "ghost") p.cloakedUntil = now + 3000;
      else {
        for (const ally of Object.values(state.players)) if (ally.team === p.team && distance(ally, p) < 7) ally.hp = Math.min(maxHp(ally), ally.hp + 28);
      }
    }
    if (input.type === "card" && p.pendingCards.includes(input.card)) {
      p.cards.push(input.card as ArenaCardId);
      p.pendingCards = [];
      p.maxHp = maxHp(p);
      p.hp = Math.min(p.hp, p.maxHp);
    }
    const weapon = ARENA_WEAPONS[input.type === "shoot" ? input.weapon : p.weapon];
    if (input.type !== "shoot" || p.weapon !== input.weapon || now < p.nextShotAt || p.spawnProtectedUntil > now) return;
    p.nextShotAt = now + fireCooldown(p, weapon.cooldown);
    p.rotation = input.yaw;
    p.pitch = clamp(input.pitch, -1.3, 1.3);
    const shotAt = Math.max(now - ARENA_LIMITS.maxRewindMs, Math.min(now, input.shotAt));
    const origin = historical(p, shotAt);
    const direction = forward(p.rotation, p.pitch);
    const seed = Math.floor(shotAt * 0.1) ^ p.id.length;
    for (let pellet = 0; pellet < weapon.pellets; pellet += 1) {
      let best: Body | null = null;
      let bestDistance: number = weapon.range;
      const spreadScale = weapon.pellets === 1 ? 1 : 1 + (((seed + pellet * 17) % 100) / 100 - 0.5) * 1.6;
      const dxAim = direction.x + Math.sin(seed + pellet) * weapon.spread * spreadScale;
      const dyAim = direction.y + Math.cos(seed * 0.7 + pellet) * weapon.spread * spreadScale;
      const dzAim = direction.z + Math.sin(seed * 0.37 + pellet * 2) * weapon.spread * spreadScale;
      const lenAim = Math.hypot(dxAim, dyAim, dzAim) || 1;
      const dir = { x: dxAim / lenAim, y: dyAim / lenAim, z: dzAim / lenAim };
      for (const target of Object.values(state.players)) {
        if (target.id === id || target.team === p.team || target.respawnAt > now || target.hp <= 0 || target.cloakedUntil > now) continue;
        const pos = historical(target, shotAt);
        const dx = pos.x - origin.x;
        const dy = pos.y + 1.0 - (origin.y + 1.25);
        const dz = pos.z - origin.z;
        const d = Math.hypot(dx, dy, dz);
        if (d > bestDistance || d < 0.05) continue;
        const dot = (dx / d) * dir.x + (dy / d) * dir.y + (dz / d) * dir.z;
        if (dot < 0.995 - weapon.spread * 1.8) continue;
        best = target; bestDistance = d;
      }
      if (best) {
        const pos = historical(best, shotAt);
        const headDistance = Math.abs((origin.y + 1.25 + direction.y * bestDistance) - (pos.y + 1.65));
        damageTarget(p, best, weapon.damage, now, headDistance < 0.22 && weapon.pellets === 1);
      }
    }
  },
  tick(state, connected, now) {
    if (state.finished) return null;
    const dt = Math.min(ARENA_LIMITS.tickClampSeconds, Math.max(0.01, (now - state.lastTick) / 1000));
    state.lastTick = now;
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    const map = ARENA_MAPS.find(candidate => candidate.id === state.mapId) ?? ARENA_MAPS[0];
    if (now >= state.zoneCycleAt) {
      state.zoneCycleAt = now + ARENA_LIMITS.zoneCycleMs;
      const nextIndex = (state.captureCount + 1) % map.zoneSpots.length;
      const [x, z] = map.zoneSpots[nextIndex];
      state.zone.x = x; state.zone.z = z; state.zone.progress = 0; state.zone.owner = null;
    }
    for (const id of state.playerIds) {
      const p = state.players[id];
      if (!p) continue;
      if (p.respawnAt && now >= p.respawnAt) {
        const spawn = spawnPoints[p.deaths % spawnPoints.length];
        p.x = spawn.x; p.y = 1; p.z = spawn.z; p.hp = maxHp(p); p.maxHp = maxHp(p); p.respawnAt = 0; p.spawnProtectedUntil = now + ARENA_LIMITS.spawnProtectionMs;
      }
      if (p.respawnAt > now) continue;
      p.x = clamp(p.x, -28, 28);
      p.z = clamp(p.z, -20, 20);
      p.stamina = Math.min(100, p.stamina + dt * (p.vx || p.vz ? 8 : 14));
      p.history = [...(p.history ?? []).filter(sample => now - sample.t < ARENA_LIMITS.historyMs), { t: now, x: p.x, y: p.y, z: p.z }];
      p.score += 0;
    }
    const active = Object.values(state.players).filter(p => p.respawnAt <= now && p.hp > 0);
    const ember = active.filter(p => p.team === "ember").some(p => distance(p, state.zone) < 4);
    const azure = active.filter(p => p.team === "azure").some(p => distance(p, state.zone) < 4);
    if (ember !== azure) {
      const owner: ArenaTeam = ember ? "ember" : "azure";
      state.zone.owner = owner;
      state.zone.progress = clamp(state.zone.progress + ARENA_LIMITS.capturePerSecond * dt, 0, 100);
      state.scores[owner] = Math.min(ARENA_LIMITS.scoreToWin, state.scores[owner] + ARENA_LIMITS.capturePerSecond * dt);
      if (state.zone.progress >= 100) {
        state.captureCount += 1;
        for (const p of Object.values(state.players)) if (p.team === owner) p.pendingCards = ["overclock", "bulwark", "ghoststep"].sort(() => Math.random() - 0.5).slice(0, ARENA_LIMITS.cardChoices);
        state.zone.progress = 0;
        state.zone.owner = null;
      }
    } else state.zone.owner = ember || azure ? null : state.zone.owner;
    if (state.scores.ember >= ARENA_LIMITS.scoreToWin || state.scores.azure >= ARENA_LIMITS.scoreToWin || state.timeLeft <= 0) {
      state.finished = true;
      state.winner = state.scores.ember === state.scores.azure ? null : state.scores.ember > state.scores.azure ? "ember" : "azure";
      return state.winner;
    }
    return null;
  },
  view(state) {
    return state;
  },
};
