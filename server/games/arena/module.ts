import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { GameModule } from "../module";
import type { ArenaAction, ArenaHero, ArenaPlayer, ArenaTeam, ArenaView, ArenaWeapon } from "../../../src/games/arena/types";

export const arenaActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("shoot"), weapon: z.enum(["pulse", "scatter", "rail"]), yaw: z.number().finite(), pitch: z.number().finite() }),
  z.object({ type: z.literal("ability") }),
  z.object({ type: z.literal("weapon"), weapon: z.enum(["pulse", "scatter", "rail"]) }),
  z.object({ type: z.literal("hero"), hero: z.enum(["striker", "warden", "ghost", "medic"]) }),
]);

type Body = ArenaPlayer & {
  vx: number;
  vz: number;
  vy: number;
  inputX: number;
  inputZ: number;
  jump: boolean;
  sprint: boolean;
  nextShotAt: number;
  respawnAt: number;
};
type State = ArenaView & { players: Record<string, Body>; lastTick: number; zoneCycleAt: number };

const weapons: Record<ArenaWeapon, { damage: number; cooldown: number; range: number; spread: number }> = {
  pulse: { damage: 20, cooldown: 140, range: 55, spread: 0.035 },
  scatter: { damage: 12, cooldown: 520, range: 24, spread: 0.22 },
  rail: { damage: 65, cooldown: 900, range: 90, spread: 0.008 },
};
const heroStats: Record<ArenaHero, { maxHp: number; speed: number; abilityCooldown: number }> = {
  striker: { maxHp: 100, speed: 9.5, abilityCooldown: 7000 },
  warden: { maxHp: 135, speed: 7.5, abilityCooldown: 9000 },
  ghost: { maxHp: 85, speed: 10.5, abilityCooldown: 8500 },
  medic: { maxHp: 105, speed: 8.8, abilityCooldown: 7500 },
};
const spawn = (id: string, index: number): Body => {
  const team: ArenaTeam = index % 2 ? "azure" : "ember";
  const hero: ArenaHero = index % 4 === 1 ? "warden" : index % 4 === 2 ? "ghost" : index % 4 === 3 ? "medic" : "striker";
  const stats = heroStats[hero];
  return {
    id, x: team === "ember" ? -8 : 8, y: 1, z: (index % 4) * 3 - 4, rotation: team === "ember" ? Math.PI / 2 : -Math.PI / 2, pitch: 0,
    team, hero, weapon: "pulse", hp: stats.maxHp, maxHp: stats.maxHp, kills: 0, deaths: 0, score: 0, abilityReadyAt: 0,
    vx: 0, vz: 0, vy: 0, inputX: 0, inputZ: 0, jump: false, sprint: false, nextShotAt: 0, respawnAt: 0,
  };
};

function forward(yaw: number, pitch: number) {
  const cp = Math.cos(pitch);
  return { x: Math.sin(yaw) * cp, y: -Math.sin(pitch), z: Math.cos(yaw) * cp };
}
function distance(a: ArenaPlayer, b: ArenaPlayer) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
function respawnPlayer(player: Body, now: number) {
  const teamX = player.team === "ember" ? -8 : 8;
  player.x = teamX; player.y = 1; player.z = 0; player.hp = player.maxHp; player.respawnAt = now + 1400; player.vx = 0; player.vz = 0;
}

export const mindbopArena: GameModule<State, ArenaView> = {
  id: "mindbop-arena",
  create(ids, now) {
    if (ids.length < 2 || ids.length > 10) throw new Error("MindBop Arena needs 2–10 players.");
    return {
      kind: "mindbop-arena", runId: randomUUID(), phase: "live", playerIds: ids,
      players: Object.fromEntries(ids.map((id, index) => [id, spawn(id, index)])),
      zone: { x: 0, z: 0, radius: 5.5, progress: 0, owner: null },
      scores: { ember: 0, azure: 0 }, timeLeft: 480, winner: null, finished: false, lastTick: now, zoneCycleAt: now + 60000,
    };
  },
  input(state, id, x, z, _now, jump, sprint) {
    const player = state.players[id];
    if (!player || player.respawnAt > _now) return;
    player.inputX = x; player.inputZ = z; player.jump ||= Boolean(jump); player.sprint = Boolean(sprint);
  },
  act(state, id, raw, now) {
    const player = state.players[id];
    if (!player || player.respawnAt > now) return;
    const action = raw as ArenaAction;
    if (action.type === "weapon") { player.weapon = action.weapon; return; }
    if (action.type === "hero") {
      const stats = heroStats[action.hero]; player.hero = action.hero; player.maxHp = stats.maxHp; player.hp = Math.min(player.hp, stats.maxHp); return;
    }
    if (action.type === "ability") {
      if (now < player.abilityReadyAt) return;
      player.abilityReadyAt = now + heroStats[player.hero].abilityCooldown;
      if (player.hero === "striker") { const dir = forward(player.rotation, 0); player.x += dir.x * 4; player.z += dir.z * 4; }
      if (player.hero === "medic") player.hp = Math.min(player.maxHp, player.hp + 30);
      if (player.hero === "warden") player.hp = Math.min(player.maxHp, player.hp + 20);
      return;
    }
    if (action.type === "shoot") {
      const weapon = weapons[action.weapon];
      if (now < player.nextShotAt) return;
      player.nextShotAt = now + weapon.cooldown;
      player.rotation = action.yaw; player.pitch = Math.max(-1.3, Math.min(1.3, action.pitch));
      const dir = forward(player.rotation, player.pitch);
      let best: Body | null = null; let bestDistance = weapon.range;
      for (const target of Object.values(state.players)) {
        if (target.id === id || target.team === player.team || target.respawnAt > now || target.hp <= 0) continue;
        const dx = target.x - player.x; const dy = (target.y + 0.9) - (player.y + 1.2); const dz = target.z - player.z;
        const len = Math.hypot(dx, dy, dz) || 1;
        const dot = (dx / len) * dir.x + (dy / len) * dir.y + (dz / len) * dir.z;
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        const hitRadius = weapon.spread + 0.045;
        const d = distance(player, target);
        if (d <= weapon.range && angle < hitRadius && d < bestDistance) { best = target; bestDistance = d; }
      }
      if (best) {
        best.hp -= weapon.damage;
        player.score += weapon.damage;
        if (best.hp <= 0) {
          player.kills += 1; player.score += 100; best.deaths += 1; best.respawnAt = now + 1800; best.hp = 0;
        }
      }
    }
  },
  tick(state, connected, now) {
    const dt = Math.min(0.08, Math.max(0.01, (now - state.lastTick) / 1000));
    state.lastTick = now; state.timeLeft = Math.max(0, 480 - (now - state.lastTick) / 1000);
    if (now >= state.zoneCycleAt) { state.zoneCycleAt = now + 60000; state.zone.x = Math.round((Math.random() * 16 - 8) * 2) / 2; state.zone.z = Math.round((Math.random() * 16 - 8) * 2) / 2; state.zone.progress = 0; state.zone.owner = null; }
    for (const id of state.playerIds) {
      const player = state.players[id]; if (!connected.includes(id)) continue;
      if (player.respawnAt && now >= player.respawnAt && player.hp <= 0) respawnPlayer(player, now);
      if (player.respawnAt > now) continue;
      const grounded = player.y <= 1.01;
      if (grounded) { player.y = 1; player.vy = Math.max(0, player.vy); if (player.jump) player.vy = 8.5; }
      player.jump = false;
      const speed = player.sprint ? heroStats[player.hero].speed * 1.22 : heroStats[player.hero].speed;
      player.vx += (player.inputX * speed - player.vx) * Math.min(1, dt * 12);
      player.vz += (player.inputZ * speed - player.vz) * Math.min(1, dt * 12);
      player.vy -= 20 * dt; player.x += player.vx * dt; player.z += player.vz * dt; player.y += player.vy * dt;
      if (player.y < 1) { player.y = 1; player.vy = 0; }
      player.x = Math.max(-18, Math.min(18, player.x)); player.z = Math.max(-18, Math.min(18, player.z));
    }
    const inZone = Object.values(state.players).filter((p) => connected.includes(p.id) && p.respawnAt <= now && Math.hypot(p.x - state.zone.x, p.z - state.zone.z) <= state.zone.radius);
    const ember = inZone.filter((p) => p.team === "ember").length; const azure = inZone.filter((p) => p.team === "azure").length;
    if (ember > azure) { state.zone.owner = "ember"; state.zone.progress = Math.min(100, state.zone.progress + dt * 12); }
    else if (azure > ember) { state.zone.owner = "azure"; state.zone.progress = Math.min(100, state.zone.progress + dt * 12); }
    if (state.zone.progress >= 100 && state.zone.owner) { state.scores[state.zone.owner] += 10; state.zone.progress = 0; }
    for (const p of Object.values(state.players)) if (p.inputX || p.inputZ) p.rotation = Math.atan2(p.inputX, p.inputZ);
    if (state.scores.ember >= 100 || state.scores.azure >= 100) { state.finished = true; state.winner = state.scores.ember >= 100 ? "ember" : "azure"; }
    return null;
  },
  finished: (state) => state.finished,
  project(state) {
    return {
      kind: state.kind, runId: state.runId, phase: state.phase, playerIds: state.playerIds,
      players: Object.fromEntries(Object.entries(state.players).map(([id, p]) => [id, { id, x:p.x, y:p.y, z:p.z, rotation:p.rotation, pitch:p.pitch, team:p.team, hero:p.hero, weapon:p.weapon, hp:p.hp, maxHp:p.maxHp, kills:p.kills, deaths:p.deaths, score:p.score, abilityReadyAt:p.abilityReadyAt }])),
      zone: state.zone, scores: state.scores, timeLeft: state.timeLeft, winner: state.winner, finished: state.finished,
    };
  },
};
