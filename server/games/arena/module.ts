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

type HistorySample = { t: number; x: number; y: number; z: number; rotation: number };
type Body = ArenaPlayer & {
  vx: number; vz: number; vy: number; inputX: number; inputZ: number;
  jump: boolean; sprint: boolean; nextShotAt: number; respawnAt: number;
  history: HistorySample[];
};
type State = ArenaView & { players: Record<string, Body>; lastTick: number; zoneCycleAt: number; captureCount: number };

type Solid = { x: number; z: number; width: number; depth: number };
const SOLIDS: Record<string, Solid[]> = {
  "neon-yard": [
    { x: -9, z: 0, width: 3.8, depth: 1.2 }, { x: 9, z: 0, width: 3.8, depth: 1.2 },
    { x: 0, z: -8, width: 8, depth: 1.2 }, { x: 0, z: 8, width: 8, depth: 1.2 },
    { x: -5, z: -5, width: 2.8, depth: 2.8 }, { x: 5, z: 5, width: 2.8, depth: 2.8 },
    { x: -13, z: 7, width: 2.2, depth: 4.6 }, { x: 13, z: -7, width: 2.2, depth: 4.6 },
  ],
  skyline: [
    { x: -11, z: -8, width: 2.5, depth: 7 }, { x: 11, z: 8, width: 2.5, depth: 7 },
    { x: 0, z: 0, width: 3.2, depth: 3.2 }, { x: -3, z: 13, width: 7, depth: 1.8 },
  ],
  reactor: [
    { x: -7, z: -10, width: 7, depth: 2.2 }, { x: 7, z: 10, width: 7, depth: 2.2 },
    { x: 0, z: 0, width: 2.4, depth: 7 }, { x: 0, z: 13, width: 9, depth: 1.5 },
  ],
};

const spawn = (id: string, index: number): Body => {
  const team: ArenaTeam = index % 2 ? "azure" : "ember";
  const hero: ArenaHero = ["striker", "warden", "ghost", "medic"][index % 4] as ArenaHero;
  const stats = ARENA_HEROES[hero];
  return {
    id, x: team === "ember" ? -12 : 12, y: 1, z: (index % 5) * 3 - 6,
    rotation: team === "ember" ? Math.PI / 2 : -Math.PI / 2, pitch: 0,
    team, hero, weapon: "pulse", hp: stats.maxHp, maxHp: stats.maxHp,
    kills: 0, deaths: 0, score: 0, abilityReadyAt: 0, stamina: 100,
    shieldUntil: 0, cloakedUntil: 0, spawnProtectedUntil: 0, cards: [], pendingCards: [],
    vx: 0, vz: 0, vy: 0, inputX: 0, inputZ: 0, jump: false, sprint: false,
    nextShotAt: 0, respawnAt: 0, history: [],
  };
};

function forward(yaw: number, pitch: number) {
  const cp = Math.cos(pitch);
  return { x: Math.sin(yaw) * cp, y: -Math.sin(pitch), z: Math.cos(yaw) * cp };
}
function hasCard(p: Body, card: ArenaCardId) { return p.cards.includes(card); }
function fireCooldown(p: Body, base: number) { return hasCard(p, "overclock") ? base * ARENA_CARDS.overclock.fireRate : base; }
function damageMultiplier(p: Body) { return hasCard(p, "sharpshot") ? ARENA_CARDS.sharpshot.damage : 1; }
function movementMultiplier(p: Body) { return hasCard(p, "ghoststep") ? ARENA_CARDS.ghoststep.speed : 1; }
function historical(p: Body, at: number) {
  if (!p.history.length) return { x: p.x, y: p.y, z: p.z };
  let before = p.history[0];
  let after = p.history[p.history.length - 1];
  for (let i = 1; i < p.history.length; i += 1) {
    if (p.history[i].t >= at) { after = p.history[i]; before = p.history[i - 1]; break; }
  }
  if (after.t === before.t) return { x: before.x, y: before.y, z: before.z };
  const a = Math.max(0, Math.min(1, (at - before.t) / (after.t - before.t)));
  return { x: before.x + (after.x - before.x) * a, y: before.y + (after.y - before.y) * a, z: before.z + (after.z - before.z) * a };
}
function remember(p: Body, now: number) {
  p.history.push({ t: now, x: p.x, y: p.y, z: p.z, rotation: p.rotation });
  const cutoff = now - ARENA_LIMITS.historyMs;
  while (p.history.length && p.history[0].t < cutoff) p.history.shift();
}
function respawn(p: Body, now: number) {
  p.x = p.team === "ember" ? -12 : 12;
  p.y = 1; p.z = 0; p.hp = p.maxHp; p.respawnAt = 0;
  p.spawnProtectedUntil = now + ARENA_LIMITS.spawnProtectionMs;
  p.stamina = 100; p.vx = 0; p.vz = 0; p.vy = 0;
  p.shieldUntil = 0; p.cloakedUntil = 0; p.nextShotAt = now + 350;
  remember(p, now);
}
function applyCard(p: Body, card: ArenaCardId) {
  if (p.cards.includes(card)) return;
  p.cards.push(card);
  if (card === "bulwark") { p.maxHp += ARENA_CARDS.bulwark.maxHp; p.hp += ARENA_CARDS.bulwark.maxHp; }
}
function chooseCards(p: Body, count: number, seed: number) {
  const all = (Object.keys(ARENA_CARDS) as ArenaCardId[]).filter(card => !p.cards.includes(card));
  if (!all.length) return [];
  const choices: ArenaCardId[] = [];
  for (let i = 0; i < Math.min(count, all.length); i += 1) choices.push(all[(seed + i * 3) % all.length]);
  return choices;
}
function damageTarget(shooter: Body, target: Body, amount: number, now: number, headshot = false) {
  if (target.respawnAt > now || target.hp <= 0 || target.spawnProtectedUntil > now) return false;
  const weaponMultiplier = damageMultiplier(shooter);
  const multiplier = headshot ? (shooter.weapon === "pulse" ? ARENA_WEAPONS.pulse.headshot : shooter.weapon === "rail" ? ARENA_WEAPONS.rail.headshot : ARENA_WEAPONS.scatter.headshot) : 1;
  const shielded = target.shieldUntil > now;
  const dealt = amount * weaponMultiplier * multiplier * (shielded ? 0.45 : 1);
  target.hp -= dealt;
  shooter.score += Math.round(dealt);
  if (target.hp <= 0) {
    target.hp = 0;
    target.deaths += 1;
    shooter.kills += 1;
    shooter.score += headshot ? 150 : 100;
    target.respawnAt = now + 1800;
    target.inputX = 0; target.inputZ = 0; target.vx = 0; target.vz = 0;
  }
  return true;
}
function resolveMovement(p: Body, mapId: string) {
  const solids = SOLIDS[mapId] ?? [];
  const radius = 0.48;
  for (const solid of solids) {
    const minX = solid.x - solid.width / 2 - radius;
    const maxX = solid.x + solid.width / 2 + radius;
    const minZ = solid.z - solid.depth / 2 - radius;
    const maxZ = solid.z + solid.depth / 2 + radius;
    if (p.x > minX && p.x < maxX && p.z > minZ && p.z < maxZ) {
      const pushX = Math.min(Math.abs(p.x - minX), Math.abs(maxX - p.x));
      const pushZ = Math.min(Math.abs(p.z - minZ), Math.abs(maxZ - p.z));
      if (pushX < pushZ) { p.x = p.x < solid.x ? minX : maxX; p.vx = 0; }
      else { p.z = p.z < solid.z ? minZ : maxZ; p.vz = 0; }
    }
  }
}

export const mindbopArena: GameModule<State, ArenaView> = {
  id: "mindbop-arena",
  create(ids, now) {
    if (ids.length < ARENA_LIMITS.minPlayers || ids.length > ARENA_LIMITS.maxPlayers) throw new Error("MindBop Arena supports 2–10 players.");
    const players = Object.fromEntries(ids.map((id, index) => [id, spawn(id, index)]));
    for (const player of Object.values(players)) remember(player, now);
    const mapIndex = Math.abs([...randomUUID()].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % ARENA_MAPS.length;
    const map = ARENA_MAPS[mapIndex];
    const [x, z] = map.zoneSpots[0];
    return {
      kind: "mindbop-arena", runId: randomUUID(), phase: "live", mapId: map.id,
      playerIds: ids, players, zone: { x, z, radius: 5.5, progress: 0, owner: null },
      scores: { ember: 0, azure: 0 }, timeLeft: ARENA_LIMITS.matchSeconds,
      winner: null, finished: false, lastTick: now, zoneCycleAt: now + ARENA_LIMITS.zoneCycleMs, captureCount: 0,
    };
  },
  input(state, id, x, z, now, jump, sprint) {
    if (state.finished) return;
    const p = state.players[id];
    if (!p || p.respawnAt > now) return;
    const length = Math.hypot(x, z) || 1;
    p.inputX = Math.max(-1, Math.min(1, x / length));
    p.inputZ = Math.max(-1, Math.min(1, z / length));
    p.jump ||= Boolean(jump);
    p.sprint = Boolean(sprint) && p.stamina > 0;
  },
  act(state, id, raw, now) {
    if (state.finished) return;
    const p = state.players[id];
    if (!p || p.respawnAt > now) return;
    const action = raw as ArenaAction;
    if (action.type === "card") {
      if (!p.pendingCards.includes(action.card)) return;
      applyCard(p, action.card);
      p.pendingCards = [];
      return;
    }
    if (action.type === "weapon") { p.weapon = action.weapon; return; }
    if (action.type === "hero") {
      const stats = ARENA_HEROES[action.hero];
      const previousBase = p.maxHp - (hasCard(p, "bulwark") ? ARENA_CARDS.bulwark.maxHp : 0);
      p.hero = action.hero; p.maxHp = stats.maxHp + (hasCard(p, "bulwark") ? ARENA_CARDS.bulwark.maxHp : 0);
      p.hp = Math.min(p.maxHp, p.hp + Math.max(0, stats.maxHp - previousBase));
      return;
    }
    if (action.type === "ability") {
      if (now < p.abilityReadyAt) return;
      p.abilityReadyAt = now + ARENA_HEROES[p.hero].abilityCooldown;
      if (p.hero === "striker") {
        const d = forward(p.rotation, 0); p.x = Math.max(-18, Math.min(18, p.x + d.x * 4.5)); p.z = Math.max(-18, Math.min(18, p.z + d.z * 4.5)); resolveMovement(p, state.mapId);
      } else if (p.hero === "medic") p.hp = Math.min(p.maxHp, p.hp + 38);
      else if (p.hero === "warden") p.shieldUntil = now + 4200;
      else if (p.hero === "ghost") p.cloakedUntil = now + 3500;
      return;
    }
    const weapon = ARENA_WEAPONS[action.weapon];
    if (action.type !== "shoot" || p.weapon !== action.weapon || now < p.nextShotAt || p.spawnProtectedUntil > now) return;
    p.nextShotAt = now + fireCooldown(p, weapon.cooldown);
    p.rotation = action.yaw;
    p.pitch = Math.max(-1.3, Math.min(1.3, action.pitch));
    const shotAt = Math.max(now - ARENA_LIMITS.maxRewindMs, Math.min(now, action.shotAt));
    const origin = historical(p, shotAt);
    const direction = forward(p.rotation, p.pitch);
    const seed = Math.floor(shotAt * 0.1) ^ p.id.length;
    for (let pellet = 0; pellet < weapon.pellets; pellet += 1) {
      let best: Body | null = null;
      let bestDistance = weapon.range;
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
      if (!connected.includes(id)) continue;
      if (p.respawnAt && now >= p.respawnAt && p.hp <= 0) respawn(p, now);
      if (p.respawnAt > now) continue;
      const sprinting = p.sprint && p.stamina > 0;
      p.stamina = Math.max(0, Math.min(100, p.stamina + (sprinting ? -30 : 22) * dt));
      if (p.y <= 1.01) { p.y = 1; p.vy = Math.max(0, p.vy); if (p.jump) p.vy = 8.5; }
      p.jump = false;
      const speed = (p.sprint && p.stamina > 0 ? ARENA_HEROES[p.hero].speed * 1.22 : ARENA_HEROES[p.hero].speed) * movementMultiplier(p);
      p.vx += (p.inputX * speed - p.vx) * Math.min(1, dt * 12);
      p.vz += (p.inputZ * speed - p.vz) * Math.min(1, dt * 12);
      p.vy -= 20 * dt; p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
      if (p.y < 1) { p.y = 1; p.vy = 0; }
      p.x = Math.max(-18, Math.min(18, p.x)); p.z = Math.max(-18, Math.min(18, p.z));
      resolveMovement(p, state.mapId);
      remember(p, now);
    }
    const inZone = Object.values(state.players).filter(p => connected.includes(p.id) && p.respawnAt <= now && Math.hypot(p.x - state.zone.x, p.z - state.zone.z) <= state.zone.radius);
    const ember = inZone.filter(p => p.team === "ember").length;
    const azure = inZone.filter(p => p.team === "azure").length;
    if (ember > azure) { state.zone.owner = "ember"; state.zone.progress = Math.min(100, state.zone.progress + dt * ARENA_LIMITS.capturePerSecond); }
    else if (azure > ember) { state.zone.owner = "azure"; state.zone.progress = Math.min(100, state.zone.progress + dt * ARENA_LIMITS.capturePerSecond); }
    else if (ember === 0 && azure === 0) state.zone.owner = null;
    if (state.zone.progress >= 100 && state.zone.owner) {
      const winner = state.zone.owner;
      state.scores[winner] += 10;
      state.captureCount += 1;
      state.zone.progress = 0;
      for (const p of Object.values(state.players)) {
        if (p.team !== winner || p.pendingCards.length || p.cards.length >= 4) continue;
        p.pendingCards = chooseCards(p, ARENA_LIMITS.cardChoices, state.captureCount + p.id.length);
      }
      const nextIndex = state.captureCount % map.zoneSpots.length;
      const [x, z] = map.zoneSpots[nextIndex];
      state.zone.x = x; state.zone.z = z; state.zone.owner = null; state.zoneCycleAt = now + ARENA_LIMITS.zoneCycleMs;
    }
    if (state.scores.ember >= ARENA_LIMITS.scoreToWin || state.scores.azure >= ARENA_LIMITS.scoreToWin || state.timeLeft <= 0) {
      state.finished = true; state.phase = "finished"; state.winner = state.scores.ember >= state.scores.azure ? "ember" : "azure";
    }
    return null;
  },
  finished: state => state.finished,
  project(state) {
    return {
      kind: state.kind, runId: state.runId, phase: state.phase, mapId: state.mapId, playerIds: state.playerIds,
      players: Object.fromEntries(Object.entries(state.players).map(([id, p]) => [id, {
        id, x: p.x, y: p.y, z: p.z, rotation: p.rotation, pitch: p.pitch, team: p.team, hero: p.hero, weapon: p.weapon,
        hp: p.hp, maxHp: p.maxHp, kills: p.kills, deaths: p.deaths, score: p.score, abilityReadyAt: p.abilityReadyAt,
        stamina: p.stamina, shieldUntil: p.shieldUntil, cloakedUntil: p.cloakedUntil, spawnProtectedUntil: p.spawnProtectedUntil,
        cards: p.cards, pendingCards: p.pendingCards,
      }])),
      zone: state.zone, scores: state.scores, timeLeft: state.timeLeft, winner: state.winner, finished: state.finished,
    };
  },
};
