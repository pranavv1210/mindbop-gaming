import { io, type Socket } from "socket.io-client";
import {
  BTN, EYE_HEIGHT, HERO_IDS, HEROES, INTERP_TICKS, TICK_MS, WEAPONS, WEAPON_IDS, ticksFromMs,
  type HeroId, type Phase,
} from "@/arena/config";
import {
  FLAG, decodeSnapshot, encodeCmd, quantizeAxis, quantizePitch, quantizeYaw,
  type Cmd, type OwnState, type SnapPlayer, type Snapshot,
} from "@/arena/codec";
import { rayWorld } from "@/arena/geometry";
import { getMap, type ArenaMap, type MapId } from "@/arena/maps";
import { newBody, stepTick, type Body, type MoveInput } from "@/arena/physics";
import { PHASES } from "@/arena/config";
import type {
  ArenaClientEvents, ArenaServerEvents, FeedEvent, HitEvent, HurtEvent, JoinReply, JoinRequest, PhaseEvent,
  RosterEvent, RosterPlayer, Welcome,
} from "@/arena/protocol";
import { ArenaAudio } from "./audio";
import { createArenaScene, type ArenaScene, type RemoteRender, type SceneQuality } from "./arena-scene";

export type FeedItem = { id: number; killer: string; victim: string; weapon: number; head: boolean; mine: boolean; me: boolean; at: number };

export type UiState = {
  stage: "idle" | "joining" | "playing" | "error";
  error: string;
  connected: boolean;
  phase: Phase;
  mapId: MapId;
  timeLeftMs: number;
  scores: [number, number];
  team: 0 | 1;
  slot: number;
  alive: boolean;
  hp: number;
  maxHp: number;
  weapon: number;
  ammo: number[];
  reloadMs: number;
  abilityMs: number;
  respawnMs: number;
  hero: HeroId;
  roster: RosterPlayer[];
  feed: FeedItem[];
  code: string | null;
  isPrivate: boolean;
  ping: number;
  fps: number;
  locked: boolean;
  winner: 0 | 1 | 2 | null;
  killLimit: number;
};

export type Settings = { sensitivity: number; fov: number; volume: number; quality: SceneQuality };
export type Hooks = {
  ui: (state: UiState) => void;
  hit: (hit: HitEvent) => void;
  hurt: (angle: number, damage: number) => void;
  notice: (message: string) => void;
};

type StoredSnap = { tick: number; recv: number; players: Map<number, SnapPlayer> };
type Pending = { cmd: Cmd; input: MoveInput };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

export class ArenaController {
  private socket: Socket<ArenaServerEvents, ArenaClientEvents>;
  private scene: ArenaScene;
  private audio = new ArenaAudio();
  private disposed = false;

  private ui: UiState;
  private uiTimer: ReturnType<typeof setInterval>;
  private pingTimer: ReturnType<typeof setInterval>;
  private feedId = 1;

  // map + roster
  private map: ArenaMap = getMap("foundry");
  private roster = new Map<number, RosterPlayer>();

  // input
  private keys = new Set<string>();
  private yaw = 0;
  private pitch = 0;
  private fireHeld = false;
  private adsHeld = false;
  private touch = { x: 0, z: 0 };
  private jumpTap = false;
  private abilityTap = false;
  private reloadTap = false;
  private weaponSel = 255;
  private weaponSelTicks = 0;
  private adsAmount = 0;
  private locked = false;

  // simulation + netcode
  private body: Body = newBody();
  private prev = { x: 0, y: 0, z: 0 };
  private pending: Pending[] = [];
  private seq = 1;
  private acc = 0;
  private err = { x: 0, y: 0, z: 0 };
  private own: OwnState | null = null;
  private ownAlive = false;
  private snaps: StoredSnap[] = [];
  private latestTick = 0;
  private latestRecv = 0;
  private lastShotAt = 0;
  private localAmmoGuard = 0;

  constructor(canvas: HTMLCanvasElement, private hooks: Hooks, private settings: Settings) {
    this.ui = {
      stage: "idle", error: "", connected: false, phase: "waiting", mapId: "foundry", timeLeftMs: 0, scores: [0, 0],
      team: 0, slot: -1, alive: false, hp: 0, maxHp: 100, weapon: 0, ammo: [30, 6, 4, 40], reloadMs: 0, abilityMs: 0,
      respawnMs: 0, hero: "striker", roster: [], feed: [], code: null, isPrivate: false, ping: 0, fps: 0,
      locked: false, winner: null, killLimit: 30,
    };
    this.audio.setVolume(settings.volume);
    this.scene = createArenaScene(canvas, settings.quality);
    this.scene.loadMap(this.map);
    this.scene.setViewVisible(false);
    this.scene.onFrame((dt) => this.frame(dt));

    this.socket = io("/arena", { transports: ["websocket"], reconnectionDelayMax: 3000, autoConnect: false });
    this.socket.on("connect", () => { this.ui.connected = true; this.emitUi(); });
    this.socket.on("disconnect", () => { this.ui.connected = false; this.emitUi(); });
    this.socket.on("connect_error", (error) => {
      this.ui.connected = false;
      const expired = error.message.includes("Session");
      this.ui.error = expired ? "Reconnecting…" : "Can’t reach the game server. Retrying…";
      this.emitUi();
      if (expired) void this.openSession(); // cookie missing/expired: get a fresh one, then retry
    });
    this.socket.on("welcome", (w) => this.onWelcome(w));
    this.socket.on("snap", (data) => this.onSnap(data));
    this.socket.on("roster", (r) => this.onRoster(r));
    this.socket.on("phase", (p) => this.onPhase(p));
    this.socket.on("feed", (f) => this.onFeed(f));
    this.socket.on("hit", (h) => this.onHit(h));
    this.socket.on("hurt", (h) => this.onHurt(h));
    this.socket.on("kicked", (k) => { this.hooks.notice(k.reason); this.leaveLocal(); });

    void this.openSession();

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("wheel", this.onWheel, { passive: true });
    window.addEventListener("contextmenu", this.onContext);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("pointerlockchange", this.onLockChange);
    this.canvas = canvas;

    this.uiTimer = setInterval(() => this.emitUi(), 100);
    this.pingTimer = setInterval(() => {
      if (!this.socket.connected) return;
      const t0 = performance.now();
      this.socket.timeout(3000).emit("ping", (err: Error | null) => { if (!err) this.ui.ping = Math.round(performance.now() - t0); });
    }, 2000);
  }

  private canvas: HTMLCanvasElement;

  // ---------- public API ----------
  async join(req: JoinRequest): Promise<JoinReply> {
    this.audio.unlock();
    this.ui.stage = "joining"; this.ui.error = ""; this.ui.hero = req.hero; this.emitUi();
    if (!this.socket.connected) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 6000);
        this.socket.once("connect", () => { clearTimeout(timer); resolve(); });
      });
    }
    if (!this.socket.connected) {
      this.ui.stage = "idle"; this.ui.error = "Can’t reach the game server. Check your connection and try again."; this.emitUi();
      return { ok: false, error: this.ui.error };
    }
    let reply: JoinReply;
    try {
      reply = (await this.socket.timeout(6000).emitWithAck("join", req)) as JoinReply;
    } catch {
      reply = { ok: false, error: "The server took too long to answer. Try again." };
    }
    if (!reply.ok) {
      this.ui.stage = "idle"; this.ui.error = reply.error; this.emitUi();
      return reply;
    }
    this.onWelcome(reply);
    return reply;
  }

  leave() {
    if (this.socket.connected) this.socket.emit("leave");
    this.leaveLocal();
  }

  private leaveLocal() {
    this.ui.stage = "idle"; this.ui.code = null; this.ui.slot = -1; this.ui.roster = []; this.ui.feed = [];
    this.ownAlive = false; this.own = null; this.pending = []; this.snaps = [];
    this.scene.setRemotes([]); this.scene.setViewVisible(false);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.emitUi();
  }

  requestLock() {
    this.audio.unlock();
    if (this.canvas.requestPointerLock && !matchMedia("(pointer: coarse)").matches) void this.canvas.requestPointerLock();
  }

  setSettings(next: Partial<Settings>) {
    this.settings = { ...this.settings, ...next };
    if (next.volume !== undefined) this.audio.setVolume(next.volume);
  }

  setHero(hero: HeroId) {
    if (!HERO_IDS.includes(hero)) return;
    this.ui.hero = hero;
    if (this.socket.connected) this.socket.emit("hero", { hero });
    this.emitUi();
  }

  selectWeapon(index: number) {
    if (index < 0 || index >= WEAPON_IDS.length) return;
    this.weaponSel = index; this.weaponSelTicks = 6;
    this.scene.setViewWeapon(index);
    this.ui.weapon = index;
  }

  touchMove(x: number, z: number) { this.touch = { x, z }; }
  touchLook(dx: number, dy: number) { this.look(dx * 1.6, dy * 1.6); }
  setFire(down: boolean) { this.fireHeld = down; }
  setAds(down: boolean) { this.adsHeld = down; }
  tapJump() { this.jumpTap = true; }
  tapAbility() { this.abilityTap = true; }
  tapReload() { this.reloadTap = true; }

  dispose() {
    this.disposed = true;
    clearInterval(this.uiTimer); clearInterval(this.pingTimer);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("contextmenu", this.onContext);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("pointerlockchange", this.onLockChange);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.scene.dispose();
  }

  // ---------- server events ----------
  private sessionBusy = false;
  /** The arena shares the site's session cookie, so make sure one exists before connecting. */
  private async openSession() {
    if (this.sessionBusy || this.disposed) return;
    this.sessionBusy = true;
    try {
      const res = await fetch("/api/session", { method: "POST", signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error("session");
      if (!this.disposed) { this.ui.error = ""; this.socket.connect(); }
    } catch {
      if (!this.disposed) {
        this.ui.error = "Can’t reach the game server. Retrying…";
        this.emitUi();
        setTimeout(() => { this.sessionBusy = false; void this.openSession(); }, 2500);
        return;
      }
    }
    this.sessionBusy = false;
  }

  private onWelcome(w: Welcome) {
    this.ui.stage = "playing"; this.ui.error = "";
    this.ui.team = w.team; this.ui.slot = w.slot; this.ui.code = w.isPrivate ? w.room : null; this.ui.isPrivate = w.isPrivate;
    this.ui.phase = w.phase; this.ui.timeLeftMs = w.endsInMs; this.ui.killLimit = w.killLimit;
    this.setMap(w.mapId);
    this.scene.setLocalTeam(w.team);
    this.scene.setViewVisible(true);
    this.scene.setViewWeapon(this.ui.weapon);
    this.emitUi();
  }

  private setMap(id: MapId) {
    if (this.ui.mapId === id && this.map.id === id) return;
    this.map = getMap(id);
    this.ui.mapId = id;
    this.scene.loadMap(this.map);
  }

  private onRoster(r: RosterEvent) {
    this.roster.clear();
    for (const p of r.players) this.roster.set(p.slot, p);
    this.ui.roster = r.players;
    this.ui.scores = r.scores;
    const me = this.roster.get(this.ui.slot);
    if (me) { this.ui.team = me.team; this.scene.setLocalTeam(me.team); }
  }

  private onPhase(p: PhaseEvent) {
    const was = this.ui.phase;
    this.ui.phase = p.phase; this.ui.winner = p.winner; this.ui.timeLeftMs = p.endsInMs;
    this.setMap(p.mapId);
    if (p.phase === "live" && was !== "live") { this.hooks.notice("Fight!"); this.audio.tick(); }
    if (p.phase === "countdown") { this.ui.feed = []; this.pending = []; }
  }

  private onFeed(f: FeedEvent) {
    const killer = this.roster.get(f.k)?.name ?? "Someone";
    const victim = this.roster.get(f.v)?.name ?? "Someone";
    const item: FeedItem = { id: this.feedId++, killer, victim, weapon: f.w, head: f.h, mine: f.k === this.ui.slot, me: f.v === this.ui.slot, at: performance.now() };
    this.ui.feed = [...this.ui.feed.filter((x) => performance.now() - x.at < 6000), item].slice(-6);
    if (item.mine) this.audio.kill();
  }

  private onHit(h: HitEvent) { this.audio.hit(h.h); this.hooks.hit(h); }

  private onHurt(h: HurtEvent) {
    const dx = h.x - this.body.x, dz = h.z - this.body.z;
    const world = Math.atan2(dx, dz);
    this.audio.hurt();
    this.hooks.hurt(world - this.yaw, h.d);
  }

  private onSnap(data: ArrayBuffer | Uint8Array) {
    const snap = decodeSnapshot(data);
    if (!snap || this.ui.stage !== "playing") return;
    const now = performance.now();
    if (snap.tick <= this.latestTick && this.snaps.length) return;
    const stored: StoredSnap = { tick: snap.tick, recv: now, players: new Map(snap.players.map((p) => [p.slot, p])) };
    this.snaps.push(stored);
    if (this.snaps.length > 12) this.snaps.shift();
    this.latestTick = snap.tick; this.latestRecv = now;
    this.ui.phase = PHASES[snap.phase] ?? this.ui.phase;
    this.ui.timeLeftMs = snap.timeLeftDs * 100;
    this.ui.scores = snap.scores;
    this.playShots(snap, stored);
    if (snap.own) this.reconcile(snap, snap.own);
  }

  private playShots(snap: Snapshot, stored: StoredSnap) {
    for (const s of snap.shots) {
      if (s.shooter === this.ui.slot) continue;
      const shooter = stored.players.get(s.shooter);
      if (!shooter) continue;
      const team = (this.roster.get(s.shooter)?.team ?? 0) as 0 | 1;
      const cp = Math.cos(shooter.yaw);
      this.scene.tracer([shooter.x + Math.sin(shooter.yaw) * 0.5, shooter.y + 1.35, shooter.z + cp * 0.5], [s.x, s.y, s.z], team, s.weapon === 2);
      const dist = Math.hypot(shooter.x - this.body.x, shooter.z - this.body.z);
      this.audio.shot(s.weapon, 1 / (1 + dist * 0.12));
    }
  }

  private reconcile(snap: Snapshot, own: OwnState) {
    const me = snap.players.find((p) => p.slot === this.ui.slot);
    const alive = Boolean(me && me.flags & FLAG.alive);
    const hero = HERO_IDS.find((h) => HEROES[h].index === own.hero) ?? this.ui.hero;
    this.own = own;
    this.ui.hp = me?.hp ?? 0;
    this.ui.hero = hero;
    this.ui.maxHp = HEROES[hero].maxHp;
    this.ui.ammo = own.ammo;
    this.ui.reloadMs = own.reloadMs; this.ui.abilityMs = own.abilityMs; this.ui.respawnMs = own.respawnMs;
    if (own.weapon === this.weaponSel) this.weaponSel = 255;
    if (this.weaponSel === 255) { this.ui.weapon = own.weapon; if (own.weapon !== this.lastViewWeapon) { this.scene.setViewWeapon(own.weapon); this.lastViewWeapon = own.weapon; } }

    const before = { x: this.body.x, y: this.body.y, z: this.body.z };
    const respawned = alive && !this.ownAlive;
    this.ownAlive = alive;
    this.ui.alive = alive;
    while (this.pending.length && this.pending[0].cmd.seq <= own.ackSeq) this.pending.shift();
    const b = this.body;
    b.x = own.x; b.y = own.y; b.z = own.z; b.vx = own.vx; b.vy = own.vy; b.vz = own.vz; b.grounded = own.grounded; b.lock = own.lock;
    if (respawned) { this.pending = []; if (me) { this.yaw = me.yaw; this.pitch = 0; } }
    let prev = { x: b.x, y: b.y, z: b.z };
    if (alive) {
      for (let i = 0; i < this.pending.length; i++) {
        if (i === this.pending.length - 1) prev = { x: b.x, y: b.y, z: b.z };
        stepTick(b, this.pending[i].input, HEROES[hero].speed, this.map);
      }
    }
    const ex = before.x - b.x, ey = before.y - b.y, ez = before.z - b.z;
    if (respawned || Math.hypot(ex, ey, ez) > 2.5) this.err = { x: 0, y: 0, z: 0 };
    else if (alive) this.err = { x: this.err.x + ex, y: this.err.y + ey, z: this.err.z + ez };
    this.prev = prev;
  }
  private lastViewWeapon = -1;

  // ---------- input ----------
  private look(dx: number, dy: number) {
    const k = 0.0022 * this.settings.sensitivity * (1 - this.adsAmount * 0.45);
    this.yaw += dx * k;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + dy * k));
  }
  private onMouseMove = (e: MouseEvent) => { if (this.locked) this.look(e.movementX, e.movementY); };
  private onMouseDown = (e: MouseEvent) => {
    if (!this.locked) return;
    if (e.button === 0) this.fireHeld = true;
    if (e.button === 2) this.adsHeld = true;
  };
  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.fireHeld = false;
    if (e.button === 2) this.adsHeld = false;
  };
  private onWheel = (e: WheelEvent) => {
    if (!this.locked) return;
    const dir = e.deltaY > 0 ? 1 : -1;
    this.selectWeapon((this.ui.weapon + dir + WEAPON_IDS.length) % WEAPON_IDS.length);
  };
  private onContext = (e: MouseEvent) => { if (this.ui.stage === "playing") e.preventDefault(); };
  private onResize = () => this.scene.resize();
  private onBlur = () => { this.keys.clear(); this.fireHeld = false; this.adsHeld = false; };
  private onLockChange = () => { this.locked = document.pointerLockElement === this.canvas; this.ui.locked = this.locked; if (!this.locked) { this.fireHeld = false; this.adsHeld = false; this.keys.clear(); } this.emitUi(); };
  private onKeyDown = (e: KeyboardEvent) => {
    if (this.ui.stage !== "playing") return;
    if (["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "Digit1", "Digit2", "Digit3", "Digit4", "Tab", "KeyR", "KeyQ", "KeyE", "KeyF"].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    this.keys.add(e.code);
    if (e.code === "Space") this.jumpTap = true;
    if (e.code === "KeyQ" || e.code === "KeyE" || e.code === "KeyF") this.abilityTap = true;
    if (e.code === "KeyR") this.reloadTap = true;
    if (e.code.startsWith("Digit")) this.selectWeapon(Number(e.code.slice(5)) - 1);
  };
  private onKeyUp = (e: KeyboardEvent) => { this.keys.delete(e.code); };

  // ---------- simulation ----------
  private buildCmd(): { cmd: Cmd; input: MoveInput } {
    const k = this.keys;
    const mxRaw = (k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0) + this.touch.x;
    const mzRaw = (k.has("KeyW") ? 1 : 0) - (k.has("KeyS") ? 1 : 0) + this.touch.z;
    const mx = quantizeAxis(Math.max(-1, Math.min(1, mxRaw)));
    const mz = quantizeAxis(Math.max(-1, Math.min(1, mzRaw)));
    const jump = this.jumpTap || k.has("Space");
    const sprint = k.has("ShiftLeft");
    const ability = this.abilityTap;
    const reload = this.reloadTap;
    let buttons = 0;
    if (jump) buttons |= BTN.jump;
    if (sprint) buttons |= BTN.sprint;
    if (this.fireHeld && this.ui.phase === "live") buttons |= BTN.fire;
    if (ability) buttons |= BTN.ability;
    if (reload) buttons |= BTN.reload;
    if (this.adsHeld) buttons |= BTN.ads;
    const renderTick = this.renderTick(performance.now());
    const viewTick = Math.max(0, Math.floor(renderTick));
    const cmd: Cmd = {
      seq: this.seq++, mx, mz, yaw: quantizeYaw(this.yaw), pitch: quantizePitch(this.pitch), buttons,
      weaponSel: this.weaponSelTicks > 0 ? this.weaponSel : 255,
      viewTick, viewFrac: Math.max(0, Math.min(255, Math.floor((renderTick - viewTick) * 256))),
    };
    if (this.weaponSelTicks > 0) this.weaponSelTicks -= 1;
    const dash = ability && this.ui.hero === "striker" && (this.own?.abilityMs ?? 0) <= 0;
    this.jumpTap = false; this.abilityTap = false; this.reloadTap = false;
    return { cmd, input: { mx, mz, yaw: cmd.yaw, jump, sprint, ads: this.adsHeld, dash } };
  }

  private step() {
    const { cmd, input } = this.buildCmd();
    this.prev = { x: this.body.x, y: this.body.y, z: this.body.z };
    stepTick(this.body, input, HEROES[this.ui.hero].speed, this.map);
    this.pending.push({ cmd, input });
    if (this.pending.length > 90) this.pending.shift();
    if (this.socket.connected) this.socket.volatile.emit("cmd", encodeCmd(cmd));
    if (input.jump && this.body.vy > 7) this.audio.jump();
    if (input.dash) this.audio.ability();
    if (cmd.buttons & BTN.reload && (this.own?.reloadMs ?? 0) === 0) this.audio.reload();
    this.localFireEffects(cmd);
  }

  private localFireEffects(cmd: Cmd) {
    if (!(cmd.buttons & BTN.fire) || !this.ownAlive) return;
    const w = WEAPONS[WEAPON_IDS[this.ui.weapon]];
    const now = performance.now();
    if (now - this.lastShotAt < w.intervalMs - 8) return;
    if ((this.ui.ammo[this.ui.weapon] ?? 0) - this.localAmmoGuard <= 0 || this.ui.reloadMs > 0) return;
    if (!w.auto && this.lastTriggerSeq === cmd.seq - 1) return;
    this.lastTriggerSeq = cmd.seq;
    this.lastShotAt = now;
    const cp = Math.cos(this.pitch);
    const dx = Math.sin(this.yaw) * cp, dy = -Math.sin(this.pitch), dz = Math.cos(this.yaw) * cp;
    const ox = this.body.x, oy = this.body.y + EYE_HEIGHT, oz = this.body.z;
    const t = Math.min(w.range, rayWorld(this.map, ox, oy, oz, dx, dy, dz, w.range));
    this.scene.tracer([ox + dx * 0.9 + Math.cos(this.yaw) * 0.25, oy - 0.2, oz + dz * 0.9 - Math.sin(this.yaw) * 0.25], [ox + dx * t, oy + dy * t, oz + dz * t], this.ui.team, this.ui.weapon === 2);
    this.scene.muzzleFlash();
    this.scene.kick(this.ui.weapon === 1 ? 1 : this.ui.weapon === 2 ? 1.2 : 0.35);
    this.pitch = Math.max(-1.45, this.pitch - (this.ui.weapon === 2 ? 0.035 : this.ui.weapon === 1 ? 0.025 : 0.006));
    this.audio.shot(this.ui.weapon, 1);
    void ticksFromMs;
  }
  private lastTriggerSeq = -10;

  private renderTick(now: number) {
    return this.latestTick + (now - this.latestRecv) / TICK_MS - INTERP_TICKS;
  }

  private frame(dt: number) {
    if (this.disposed || this.ui.stage !== "playing") return;
    const now = performance.now();
    if (this.ownAlive && this.locked || this.ownAlive && matchMedia("(pointer: coarse)").matches) {
      this.acc = Math.min(this.acc + dt * 1000, TICK_MS * 5);
      while (this.acc >= TICK_MS) { this.step(); this.acc -= TICK_MS; }
    } else {
      this.acc = 0;
      if (this.ownAlive && !this.locked) {
        // Menu open or cursor free: keep the player standing still but stay in sync with the server.
        this.pending = [];
        if (this.own) { this.body.x = this.own.x; this.body.y = this.own.y; this.body.z = this.own.z; }
      }
    }
    const adsTarget = this.adsHeld && this.ownAlive ? 1 : 0;
    this.adsAmount += (adsTarget - this.adsAmount) * Math.min(1, dt * 12);
    const w = WEAPONS[WEAPON_IDS[this.ui.weapon] ?? "pulse"];
    const fov = this.settings.fov * (Math.PI / 180) / (1 + (w.zoom - 1) * this.adsAmount);
    const alpha = this.ownAlive ? this.acc / TICK_MS : 1;
    const decay = Math.exp(-dt * 12);
    this.err.x *= decay; this.err.y *= decay; this.err.z *= decay;
    const px = lerp(this.prev.x, this.body.x, alpha) + this.err.x;
    const py = lerp(this.prev.y, this.body.y, alpha) + this.err.y;
    const pz = lerp(this.prev.z, this.body.z, alpha) + this.err.z;
    this.scene.setLocal(px, py, pz, this.yaw, this.pitch, fov);
    this.scene.setViewVisible(this.ownAlive);
    this.renderRemotes(now);
  }

  private renderRemotes(now: number) {
    const snaps = this.snaps;
    if (snaps.length === 0) { this.scene.setRemotes([]); return; }
    const t = this.renderTick(now);
    let a = snaps[0], b = snaps[snaps.length - 1];
    for (let i = 0; i < snaps.length - 1; i++) {
      if (snaps[i].tick <= t && snaps[i + 1].tick >= t) { a = snaps[i]; b = snaps[i + 1]; break; }
    }
    const span = b.tick - a.tick;
    const f = span <= 0 ? 1 : Math.max(0, Math.min(1, (t - a.tick) / span));
    const out: RemoteRender[] = [];
    for (const [slot, pb] of b.players) {
      if (slot === this.ui.slot) continue;
      const pa = a.players.get(slot);
      const same = pa && pa.gen === pb.gen;
      const info = this.roster.get(slot);
      if (!info || info.gen !== pb.gen) continue;
      out.push({
        slot, name: info.name, team: info.team,
        x: same ? lerp(pa.x, pb.x, f) : pb.x, y: same ? lerp(pa.y, pb.y, f) : pb.y, z: same ? lerp(pa.z, pb.z, f) : pb.z,
        yaw: same ? lerpAngle(pa.yaw, pb.yaw, f) : pb.yaw, pitch: same ? lerp(pa.pitch, pb.pitch, f) : pb.pitch,
        alive: Boolean(pb.flags & FLAG.alive), cloaked: Boolean(pb.flags & FLAG.cloak), shield: Boolean(pb.flags & FLAG.shield),
        protect: Boolean(pb.flags & FLAG.protect),
      });
    }
    this.scene.setRemotes(out);
  }

  private emitUi() {
    if (this.disposed) return;
    this.ui.fps = Math.round(this.scene.fps());
    this.ui.feed = this.ui.feed.filter((x) => performance.now() - x.at < 6000);
    this.hooks.ui({ ...this.ui, roster: this.ui.roster, feed: this.ui.feed });
  }
}
