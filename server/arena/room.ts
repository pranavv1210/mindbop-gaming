import {
  ABILITY, BTN, COUNTDOWN_TICKS, DISCONNECT_GRACE_TICKS, END_TICKS, EYE_HEIGHT, HEROES, HERO_IDS,
  HIT_BODY_RADIUS, HIT_BODY_TOP, HIT_HEAD_CENTER, HIT_HEAD_RADIUS, HISTORY_TICKS, KILL_LIMIT, MATCH_TICKS,
  MAX_PLAYERS_PER_ROOM, MAX_QUEUED_CMDS, MAX_REPEAT_TICKS, MAX_REWIND_TICKS, MIN_PLAYERS_TO_START, PHASES,
  RESPAWN_TICKS, SPAWN_PROTECT_TICKS, TICK_MS, WEAPONS, WEAPON_IDS, WEAPON_SWITCH_TICKS, ticksFromMs,
  type HeroId, type Phase, type TeamIndex,
} from "../../src/arena/config";
import {
  FLAG, encodeOwnBlock, encodeSnapshotCommon, joinSnapshot, quantizeYaw,
  type Cmd, type SnapPlayer, type SnapShot,
} from "../../src/arena/codec";
import { rayCylinderY, rayWorld, raySphere } from "../../src/arena/geometry";
import { MAP_IDS, getMap, type ArenaMap, type MapId } from "../../src/arena/maps";
import { newBody, stepTick, type Body, type MoveInput } from "../../src/arena/physics";
import { createRng, type Rng } from "./rng";

export type RoomOut = {
  snapshot(playerId: string, data: Uint8Array): void;
  event(target: string, name: string, payload: unknown): void;
};
export const ALL = "*";

export type RosterEntry = {
  slot: number; gen: number; name: string; team: TeamIndex; hero: HeroId;
  kills: number; deaths: number; score: number; connected: boolean;
};

export type Member = {
  id: string; name: string; slot: number; gen: number; team: TeamIndex;
  hero: HeroId; nextHero: HeroId;
  body: Body; yaw: number; pitch: number;
  hp: number; maxHp: number; alive: boolean; respawnTick: number; protectUntil: number;
  weapon: number; ammo: [number, number, number, number];
  reloadEnd: number; nextFire: number; switchEnd: number; prevFire: boolean;
  abilityReady: number; barrierUntil: number; cloakUntil: number;
  kills: number; deaths: number; score: number;
  queue: Cmd[]; lastCmd: Cmd | null; repeat: number; ackSeq: number; lastQueuedSeq: number;
  connected: boolean; disconnectedTick: number;
  hist: Float32Array; histTick: Int32Array;
};

export type JoinResult = { ok: true; slot: number; reclaimed: boolean } | { ok: false; error: string };

export const sanitizeName = (raw: string) => {
  // eslint-disable-next-line no-control-regex
  const clean = raw.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 18);
  return clean || "Player";
};

const fullAmmo = (): [number, number, number, number] => [
  WEAPONS.pulse.mag, WEAPONS.scatter.mag, WEAPONS.rail.mag, WEAPONS.arc.mag,
];
const weaponByIndex = WEAPON_IDS.map((id) => WEAPONS[id]);
const fireTicks = weaponByIndex.map((w) => ticksFromMs(w.intervalMs));
const reloadTicks = weaponByIndex.map((w) => ticksFromMs(w.reloadMs));

export type RoomOptions = {
  id: string;
  out: RoomOut;
  seed?: number;
  isPrivate?: boolean;
  mapId?: MapId;
};

export class ArenaRoom {
  readonly id: string;
  readonly isPrivate: boolean;
  tick = 0;
  phase: Phase = "waiting";
  phaseEnd = 0;
  mapId: MapId;
  map: ArenaMap;
  scores: [number, number] = [0, 0];
  winner: 0 | 1 | 2 | null = null;
  emptySince = 0;
  readonly slots: (Member | null)[] = new Array(MAX_PLAYERS_PER_ROOM).fill(null);
  private readonly slotGen: number[] = new Array(MAX_PLAYERS_PER_ROOM).fill(0);
  private readonly members = new Map<string, Member>();
  private readonly out: RoomOut;
  private readonly rng: Rng;
  private rosterDirty = true;
  private lastRosterTick = -100;
  private shots: SnapShot[] = [];
  private mapRotation: number;
  private order = 0;

  constructor(opts: RoomOptions) {
    this.id = opts.id;
    this.out = opts.out;
    this.isPrivate = Boolean(opts.isPrivate);
    this.rng = createRng(opts.seed ?? 0x9e3779b9);
    this.mapRotation = opts.mapId ? MAP_IDS.indexOf(opts.mapId) : Math.floor(this.rng() * MAP_IDS.length);
    this.mapId = MAP_IDS[this.mapRotation];
    this.map = getMap(this.mapId);
  }

  // ---------- membership ----------
  get size() { return this.members.size; }
  get connectedCount() { let n = 0; for (const m of this.members.values()) if (m.connected) n++; return n; }
  get isFull() { return this.members.size >= MAX_PLAYERS_PER_ROOM; }
  has(playerId: string) { return this.members.has(playerId); }
  member(playerId: string) { return this.members.get(playerId); }
  *allMembers() { yield* this.members.values(); }

  join(playerId: string, rawName: string, hero: HeroId): JoinResult {
    const existing = this.members.get(playerId);
    if (existing) {
      existing.connected = true;
      existing.name = sanitizeName(rawName);
      existing.queue.length = 0;
      existing.lastCmd = null;
      if (!existing.alive) existing.respawnTick = Math.min(existing.respawnTick, this.tick + 1);
      this.rosterDirty = true;
      return { ok: true, slot: existing.slot, reclaimed: true };
    }
    const slot = this.slots.findIndex((s) => s === null);
    if (slot < 0) return { ok: false, error: "This room is full." };
    const counts: [number, number] = [0, 0];
    for (const m of this.members.values()) counts[m.team]++;
    const team: TeamIndex = counts[0] === counts[1] ? (this.scores[0] === this.scores[1] ? (this.rng() < 0.5 ? 0 : 1) : this.scores[0] < this.scores[1] ? 0 : 1) : counts[0] < counts[1] ? 0 : 1;
    this.slotGen[slot] = (this.slotGen[slot] + 1) & 15;
    const safeHero: HeroId = HERO_IDS.includes(hero) ? hero : "striker";
    const stats = HEROES[safeHero];
    const m: Member = {
      id: playerId, name: sanitizeName(rawName), slot, gen: this.slotGen[slot], team,
      hero: safeHero, nextHero: safeHero,
      body: newBody(), yaw: 0, pitch: 0,
      hp: stats.maxHp, maxHp: stats.maxHp, alive: false, respawnTick: this.tick, protectUntil: 0,
      weapon: 0, ammo: fullAmmo(), reloadEnd: 0, nextFire: 0, switchEnd: 0, prevFire: false,
      abilityReady: 0, barrierUntil: 0, cloakUntil: 0,
      kills: 0, deaths: 0, score: 0,
      queue: [], lastCmd: null, repeat: 0, ackSeq: 0, lastQueuedSeq: -1,
      connected: true, disconnectedTick: 0,
      hist: new Float32Array(HISTORY_TICKS * 4), histTick: new Int32Array(HISTORY_TICKS).fill(-1),
    };
    this.members.set(playerId, m);
    this.slots[slot] = m;
    this.spawn(m);
    this.emptySince = 0;
    this.rosterDirty = true;
    return { ok: true, slot, reclaimed: false };
  }

  leave(playerId: string) {
    const m = this.members.get(playerId);
    if (!m) return;
    this.members.delete(playerId);
    this.slots[m.slot] = null;
    this.rosterDirty = true;
    if (this.members.size === 0) this.emptySince = this.tick;
  }

  disconnect(playerId: string) {
    const m = this.members.get(playerId);
    if (!m || !m.connected) return;
    m.connected = false;
    m.disconnectedTick = this.tick;
    m.queue.length = 0;
    this.rosterDirty = true;
  }

  setHero(playerId: string, hero: HeroId) {
    const m = this.members.get(playerId);
    if (!m || !HERO_IDS.includes(hero)) return;
    m.nextHero = hero;
    if (!m.alive || this.phase !== "live") {
      this.applyHero(m);
      if (m.alive) this.spawn(m);
    }
    this.rosterDirty = true;
  }

  pushCmd(playerId: string, cmd: Cmd) {
    const m = this.members.get(playerId);
    if (!m || !m.connected) return false;
    if (cmd.seq <= m.lastQueuedSeq) return false;
    m.lastQueuedSeq = cmd.seq;
    if (m.queue.length >= MAX_QUEUED_CMDS) m.queue.shift();
    m.queue.push(cmd);
    return true;
  }

  // ---------- simulation ----------
  step() {
    this.tick += 1;
    this.shots = [];
    this.updatePhase();
    const list = [...this.members.values()];
    const n = list.length;
    this.order = (this.order + 1) % Math.max(1, n);
    for (let i = 0; i < n; i++) this.processMember(list[(i + this.order) % n]);
    for (const m of list) this.record(m);
    for (const m of list) {
      if (!m.connected && this.tick - m.disconnectedTick >= DISCONNECT_GRACE_TICKS) this.leave(m.id);
    }
    this.broadcast();
    if (this.rosterDirty && this.tick - this.lastRosterTick >= 15) this.flushRoster();
  }

  private updatePhase() {
    const connected = this.connectedCount;
    if (this.phase === "waiting") {
      if (connected >= MIN_PLAYERS_TO_START) this.beginCountdown();
    } else if (this.phase === "countdown") {
      if (connected < MIN_PLAYERS_TO_START) this.setPhase("waiting", 0);
      else if (this.tick >= this.phaseEnd) this.startMatch();
    } else if (this.phase === "live") {
      if (connected < MIN_PLAYERS_TO_START) this.setPhase("waiting", 0);
      else if (this.scores[0] >= KILL_LIMIT || this.scores[1] >= KILL_LIMIT || this.tick >= this.phaseEnd) this.endMatch();
    } else if (this.phase === "ended" && this.tick >= this.phaseEnd) {
      if (connected >= MIN_PLAYERS_TO_START) this.beginCountdown();
      else this.setPhase("waiting", 0);
    }
  }

  private setPhase(phase: Phase, endTick: number) {
    this.phase = phase;
    this.phaseEnd = endTick;
    this.out.event(ALL, "phase", { phase, mapId: this.mapId, winner: this.winner, endsInMs: endTick ? Math.round((endTick - this.tick) * TICK_MS) : 0 });
    this.rosterDirty = true;
  }

  private beginCountdown() {
    this.mapRotation = (this.mapRotation + 1) % MAP_IDS.length;
    this.mapId = MAP_IDS[this.mapRotation];
    this.map = getMap(this.mapId);
    this.winner = null;
    this.scores = [0, 0];
    this.rebalance();
    for (const m of this.members.values()) { this.resetStats(m); this.spawn(m); }
    this.setPhase("countdown", this.tick + COUNTDOWN_TICKS);
  }

  private startMatch() {
    this.scores = [0, 0];
    for (const m of this.members.values()) { this.resetStats(m); this.spawn(m); m.protectUntil = this.tick + SPAWN_PROTECT_TICKS; }
    this.setPhase("live", this.tick + MATCH_TICKS);
  }

  private endMatch() {
    this.winner = this.scores[0] === this.scores[1] ? 2 : this.scores[0] > this.scores[1] ? 0 : 1;
    this.setPhase("ended", this.tick + END_TICKS);
    this.flushRoster();
  }

  private resetStats(m: Member) {
    m.kills = 0; m.deaths = 0; m.score = 0;
    m.abilityReady = 0; m.barrierUntil = 0; m.cloakUntil = 0;
    this.applyHero(m);
  }

  private rebalance() {
    for (let guard = 0; guard < MAX_PLAYERS_PER_ROOM; guard++) {
      const teams: Member[][] = [[], []];
      for (const m of this.members.values()) teams[m.team].push(m);
      const diff = teams[0].length - teams[1].length;
      if (Math.abs(diff) <= 1) return;
      const from = diff > 0 ? teams[0] : teams[1];
      const pick = from[Math.floor(this.rng() * from.length)];
      pick.team = pick.team === 0 ? 1 : 0;
    }
  }

  private applyHero(m: Member) {
    m.hero = m.nextHero;
    m.maxHp = HEROES[m.hero].maxHp;
  }

  private spawn(m: Member) {
    this.applyHero(m);
    const spawns = this.map.spawns[m.team];
    const enemies = [...this.members.values()].filter((e) => e.alive && e.team !== m.team);
    const friends = [...this.members.values()].filter((e) => e.alive && e.team === m.team && e !== m);
    let best = spawns[0];
    let bestScore = -Infinity;
    for (const sp of spawns) {
      let enemyDist = Infinity;
      for (const e of enemies) enemyDist = Math.min(enemyDist, Math.hypot(e.body.x - sp.x, e.body.z - sp.z));
      let crowd = 0;
      for (const f of friends) if (Math.hypot(f.body.x - sp.x, f.body.z - sp.z) < 1.6) crowd += 1;
      const score = (Number.isFinite(enemyDist) ? enemyDist : 10) - crowd * 100 + this.rng() * 0.5;
      if (score > bestScore) { bestScore = score; best = sp; }
    }
    const b = m.body;
    b.x = best.x; b.y = 0; b.z = best.z; b.vx = 0; b.vy = 0; b.vz = 0; b.grounded = true; b.lock = 0;
    m.yaw = quantizeYaw(best.yaw); m.pitch = 0;
    m.hp = m.maxHp; m.alive = true;
    m.ammo = fullAmmo(); m.reloadEnd = 0; m.nextFire = 0; m.switchEnd = 0; m.prevFire = false;
    m.barrierUntil = 0; m.cloakUntil = 0;
    m.protectUntil = this.tick + SPAWN_PROTECT_TICKS;
    m.queue.length = 0; m.lastCmd = null; m.repeat = 0;
  }

  private takeCmd(m: Member): { cmd: Cmd; fresh: boolean } | null {
    const next = m.queue.shift();
    if (next) {
      m.lastCmd = next; m.repeat = 0; m.ackSeq = next.seq;
      return { cmd: next, fresh: true };
    }
    if (m.lastCmd && m.repeat < MAX_REPEAT_TICKS) {
      m.repeat += 1;
      return { cmd: { ...m.lastCmd, buttons: m.lastCmd.buttons & (BTN.sprint | BTN.ads), weaponSel: 255 }, fresh: false };
    }
    return null;
  }

  private processMember(m: Member) {
    if (!m.connected) return;
    if (!m.alive) {
      m.queue.length = 0;
      if (this.phase !== "ended" && this.tick >= m.respawnTick) this.spawn(m);
      return;
    }
    const taken = this.takeCmd(m);
    const idle: MoveInput = { mx: 0, mz: 0, yaw: m.yaw, jump: false, sprint: false, ads: false, dash: false };
    if (!taken) {
      stepTick(m.body, idle, HEROES[m.hero].speed, this.map);
      return;
    }
    const { cmd, fresh } = taken;
    m.yaw = cmd.yaw;
    m.pitch = cmd.pitch;
    const btn = cmd.buttons;
    let dash = false;
    if (fresh) {
      const sel = cmd.weaponSel;
      if (sel < weaponByIndex.length && sel !== m.weapon && this.tick >= m.switchEnd) {
        m.weapon = sel; m.switchEnd = this.tick + WEAPON_SWITCH_TICKS; m.reloadEnd = 0;
      }
      if (m.reloadEnd > 0 && this.tick >= m.reloadEnd) { m.ammo[m.weapon] = weaponByIndex[m.weapon].mag; m.reloadEnd = 0; }
      if (btn & BTN.reload) this.startReload(m);
      if (btn & BTN.ability && this.tick >= m.abilityReady && this.phase !== "ended") dash = this.useAbility(m);
    }
    const input: MoveInput = {
      mx: cmd.mx, mz: cmd.mz, yaw: cmd.yaw,
      jump: Boolean(btn & BTN.jump), sprint: Boolean(btn & BTN.sprint), ads: Boolean(btn & BTN.ads), dash,
    };
    stepTick(m.body, input, HEROES[m.hero].speed, this.map);
    const firing = Boolean(btn & BTN.fire);
    if (fresh && firing && this.phase === "live") this.tryFire(m, cmd);
    if (fresh) m.prevFire = firing;
  }

  private startReload(m: Member) {
    const w = weaponByIndex[m.weapon];
    if (m.reloadEnd > 0 || m.ammo[m.weapon] >= w.mag) return;
    m.reloadEnd = this.tick + reloadTicks[m.weapon];
  }

  /** Returns true when the ability is a dash (movement is applied by the caller). */
  private useAbility(m: Member): boolean {
    const hero = HEROES[m.hero];
    m.abilityReady = this.tick + hero.abilityCooldownTicks;
    switch (m.hero) {
      case "striker": return true;
      case "warden": m.barrierUntil = this.tick + ABILITY.barrierTicks; return false;
      case "ghost": m.cloakUntil = this.tick + ABILITY.cloakTicks; return false;
      case "medic":
        for (const o of this.members.values()) {
          if (!o.alive || o.team !== m.team) continue;
          if (o === m || Math.hypot(o.body.x - m.body.x, o.body.z - m.body.z) <= ABILITY.healRadius) o.hp = Math.min(o.maxHp, o.hp + ABILITY.healAmount);
        }
        return false;
    }
  }

  private tryFire(m: Member, cmd: Cmd) {
    const wi = m.weapon;
    const w = weaponByIndex[wi];
    if (this.tick < m.nextFire || this.tick < m.switchEnd) return;
    if (m.reloadEnd > 0) {
      if (this.tick >= m.reloadEnd) { m.ammo[wi] = w.mag; m.reloadEnd = 0; } else return;
    }
    if (!w.auto && m.prevFire) return;
    if (m.ammo[wi] <= 0) { this.startReload(m); return; }
    m.ammo[wi] -= 1;
    m.nextFire = this.tick + fireTicks[wi];
    m.cloakUntil = 0;
    m.protectUntil = Math.min(m.protectUntil, this.tick);
    if (m.ammo[wi] === 0) this.startReload(m);

    const ox = m.body.x, oy = m.body.y + EYE_HEIGHT, oz = m.body.z;
    const base = (cmd.buttons & BTN.ads ? w.spreadAds : w.spreadHip) + (m.body.grounded ? 0 : 0.02);
    const rewind = this.rewindTime(cmd);
    const perTarget = new Map<Member, { damage: number; head: boolean }>();
    let tracer: SnapShot | null = null;
    for (let p = 0; p < w.pellets; p++) {
      let yaw = m.yaw, pitch = m.pitch;
      if (base > 0) {
        const r = base * Math.sqrt(this.rng());
        const a = this.rng() * Math.PI * 2;
        yaw += r * Math.cos(a);
        pitch += r * Math.sin(a);
      }
      const cp = Math.cos(pitch);
      const dx = Math.sin(yaw) * cp, dy = -Math.sin(pitch), dz = Math.cos(yaw) * cp;
      let best = Math.min(w.range, rayWorld(this.map, ox, oy, oz, dx, dy, dz, w.range));
      let victim: Member | null = null;
      let head = false;
      for (const q of this.members.values()) {
        if (q === m || q.team === m.team || !q.alive || !q.connected || this.tick < q.protectUntil) continue;
        const pos = this.positionAt(q, rewind);
        if (!pos) continue;
        const tb = rayCylinderY(ox, oy, oz, dx, dy, dz, pos.x, pos.z, HIT_BODY_RADIUS, pos.y, pos.y + HIT_BODY_TOP, best);
        const th = raySphere(ox, oy, oz, dx, dy, dz, pos.x, pos.y + HIT_HEAD_CENTER, pos.z, HIT_HEAD_RADIUS, best);
        const t = Math.min(tb, th);
        if (t < best) { best = t; victim = q; head = th <= tb; }
      }
      if (victim) {
        const falloff = best <= w.falloffStart ? 1 : Math.max(w.falloffMin, 1 - (1 - w.falloffMin) * ((best - w.falloffStart) / Math.max(1, w.range - w.falloffStart)));
        const dmg = w.damage * falloff * (head ? w.headshot : 1);
        const acc = perTarget.get(victim) ?? { damage: 0, head: false };
        acc.damage += dmg; acc.head = acc.head || head;
        perTarget.set(victim, acc);
      }
      if (!tracer) tracer = { shooter: m.slot, weapon: wi, x: ox + dx * best, y: oy + dy * best, z: oz + dz * best };
    }
    if (tracer) this.shots.push(tracer);
    for (const [victim, acc] of perTarget) this.damage(victim, m, acc.damage, acc.head, wi);
  }

  private rewindTime(cmd: Cmd) {
    const requested = cmd.viewTick + cmd.viewFrac / 256;
    const hi = this.tick - 1;
    const lo = this.tick - MAX_REWIND_TICKS;
    if (cmd.viewTick === 0) return hi;
    return requested < lo ? lo : requested > hi ? hi : requested;
  }

  private positionAt(q: Member, time: number): { x: number; y: number; z: number } | null {
    const i0 = Math.floor(time);
    const f = time - i0;
    const a = this.histEntry(q, i0);
    const b = this.histEntry(q, i0 + 1);
    if (a && b) return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f };
    const one = a ?? b;
    if (one) return one;
    return q.alive ? { x: q.body.x, y: q.body.y, z: q.body.z } : null;
  }

  private histEntry(q: Member, tick: number) {
    const idx = ((tick % HISTORY_TICKS) + HISTORY_TICKS) % HISTORY_TICKS;
    if (q.histTick[idx] !== tick) return null;
    const o = idx * 4;
    if (q.hist[o + 3] === 0) return null;
    return { x: q.hist[o], y: q.hist[o + 1], z: q.hist[o + 2] };
  }

  private record(m: Member) {
    const idx = this.tick % HISTORY_TICKS;
    const o = idx * 4;
    m.hist[o] = m.body.x; m.hist[o + 1] = m.body.y; m.hist[o + 2] = m.body.z;
    m.hist[o + 3] = m.alive && m.connected ? 1 : 0;
    m.histTick[idx] = this.tick;
  }

  damage(victim: Member, attacker: Member, raw: number, head: boolean, weaponIndex: number) {
    if (!victim.alive || this.tick < victim.protectUntil || this.phase !== "live") return 0;
    let dmg = raw;
    if (this.tick < victim.barrierUntil) dmg *= ABILITY.barrierDamageMul;
    dmg = Math.max(1, Math.round(dmg));
    victim.hp -= dmg;
    const killed = victim.hp <= 0;
    this.out.event(attacker.id, "hit", { v: victim.slot, d: dmg, h: head, k: killed });
    this.out.event(victim.id, "hurt", { x: attacker.body.x, z: attacker.body.z, d: dmg });
    if (killed) {
      victim.hp = 0; victim.alive = false; victim.deaths += 1;
      victim.respawnTick = this.tick + RESPAWN_TICKS;
      victim.cloakUntil = 0; victim.barrierUntil = 0;
      attacker.kills += 1; attacker.score += head ? 150 : 100;
      this.scores[attacker.team] += 1;
      this.out.event(ALL, "feed", { k: attacker.slot, kg: attacker.gen, v: victim.slot, vg: victim.gen, w: weaponIndex, h: head });
      this.rosterDirty = true;
    }
    return dmg;
  }

  // ---------- network output ----------
  private flagsFor(m: Member) {
    let f = 0;
    if (m.alive) f |= FLAG.alive;
    if (m.body.grounded) f |= FLAG.grounded;
    if (this.tick < m.barrierUntil) f |= FLAG.shield;
    if (this.tick < m.cloakUntil) f |= FLAG.cloak;
    if (m.reloadEnd > 0) f |= FLAG.reloading;
    if (this.tick < m.protectUntil) f |= FLAG.protect;
    if (Math.hypot(m.body.vx, m.body.vz) > HEROES[m.hero].speed * 1.05) f |= FLAG.sprint;
    return f;
  }

  private broadcast() {
    const records: [SnapPlayer[], SnapPlayer[]] = [[], []];
    for (const m of this.members.values()) {
      if (!m.connected) continue;
      const rec: SnapPlayer = {
        slot: m.slot, gen: m.gen, x: m.body.x, y: m.body.y, z: m.body.z, yaw: m.yaw, pitch: m.pitch,
        hp: m.alive ? m.hp : 0, flags: this.flagsFor(m), weapon: m.weapon,
      };
      if (m.alive && this.tick - 0 < m.cloakUntil) {
        // Cloaked players are hidden from the opposing team entirely (no wallhack possible).
        records[m.team].push(rec);
      } else {
        records[0].push(rec); records[1].push(rec);
      }
    }
    const left = this.phase === "waiting" ? 0 : Math.max(0, this.phaseEnd - this.tick);
    const phaseIndex = PHASES.indexOf(this.phase);
    const commons: [Uint8Array, Uint8Array] = [
      encodeSnapshotCommon(this.tick, phaseIndex, left, 3, this.scores, records[0], this.shots),
      encodeSnapshotCommon(this.tick, phaseIndex, left, 3, this.scores, records[1], this.shots),
    ];
    for (const m of this.members.values()) {
      if (!m.connected) continue;
      const own = encodeOwnBlock({
        ackSeq: m.ackSeq,
        x: m.body.x, y: m.body.y, z: m.body.z, vx: m.body.vx, vy: m.body.vy, vz: m.body.vz,
        grounded: m.body.grounded, lock: m.body.lock, weapon: m.weapon, hero: HEROES[m.hero].index, ammo: m.ammo,
        reloadMs: m.reloadEnd > 0 ? Math.round(Math.max(0, m.reloadEnd - this.tick) * TICK_MS) : 0,
        abilityMs: Math.round(Math.max(0, m.abilityReady - this.tick) * TICK_MS),
        respawnMs: m.alive ? 0 : Math.round(Math.max(0, m.respawnTick - this.tick) * TICK_MS),
      });
      this.out.snapshot(m.id, joinSnapshot(commons[m.team], own));
    }
  }

  roster(): RosterEntry[] {
    return [...this.members.values()].map((m) => ({
      slot: m.slot, gen: m.gen, name: m.name, team: m.team, hero: m.nextHero,
      kills: m.kills, deaths: m.deaths, score: m.score, connected: m.connected,
    }));
  }

  flushRoster() {
    this.rosterDirty = false;
    this.lastRosterTick = this.tick;
    this.out.event(ALL, "roster", { players: this.roster(), scores: this.scores });
  }

  welcome(playerId: string) {
    const m = this.members.get(playerId);
    if (!m) return null;
    return {
      room: this.id, slot: m.slot, gen: m.gen, team: m.team, mapId: this.mapId, phase: this.phase,
      tick: this.tick, endsInMs: this.phaseEnd ? Math.round(Math.max(0, this.phaseEnd - this.tick) * TICK_MS) : 0,
      isPrivate: this.isPrivate, killLimit: KILL_LIMIT,
    };
  }
}
