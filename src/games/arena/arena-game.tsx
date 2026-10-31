"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import { Crosshair, LogOut, Maximize2, RotateCcw, Settings2, Shield, Skull, Users, Wifi, X, Zap } from "lucide-react";
import { useGame } from "@/components/game-provider";
import { MobileLandscapeGate } from "@/components/mobile-landscape-gate";
import { HERO_IDS, HEROES, TEAM_NAMES, WEAPONS, WEAPON_IDS, type HeroId } from "@/arena/config";
import { MAP_IDS, getMap } from "@/arena/maps";
import { ArenaController, type Settings, type UiState } from "./controller";
import { RotateGate } from "@/components/rotate-gate";
import styles from "./arena.module.css";

const DEFAULTS: Settings = { sensitivity: 1, fov: 78, volume: 0.6, quality: "auto" };
const STORE = "mindbop-arena-settings-v2";
const HERO_KEY = "mindbop-arena-hero";

function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? "{}") as Partial<Settings>;
    return {
      sensitivity: typeof raw.sensitivity === "number" ? Math.min(3, Math.max(0.2, raw.sensitivity)) : DEFAULTS.sensitivity,
      fov: typeof raw.fov === "number" ? Math.min(110, Math.max(60, raw.fov)) : DEFAULTS.fov,
      volume: typeof raw.volume === "number" ? Math.min(1, Math.max(0, raw.volume)) : DEFAULTS.volume,
      quality: raw.quality === "low" || raw.quality === "high" || raw.quality === "ultra" ? raw.quality : "auto",
    };
  } catch { return DEFAULTS; }
}
function loadHero(): HeroId {
  try { const h = localStorage.getItem(HERO_KEY) as HeroId | null; if (h && HERO_IDS.includes(h)) return h; } catch { /* storage unavailable */ }
  return "striker";
}
function save(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } }

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function ArenaGame() {
  const { guest, id, connectionError } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controller = useRef<ArenaController | null>(null);
  const [ui, setUi] = useState<UiState | null>(null);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [initialSettings] = useState(settings);
  const [hero, setHero] = useState<HeroId>(loadHero);
  const [hit, setHit] = useState({ key: 0, head: false, kill: false });
  const [hurts, setHurts] = useState<Array<{ id: number; angle: number }>>([]);
  const [notice, setNotice] = useState("");
  const [score, setScore] = useState(false);
  const [code, setCode] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const hurtId = useRef(0);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!id || !canvas) return;
    const c = new ArenaController(canvas, {
      ui: setUi,
      hit: (h) => setHit((prev) => ({ key: prev.key + 1, head: h.h, kill: h.k })),
      hurt: (angle) => {
        const entry = { id: ++hurtId.current, angle };
        setHurts((list) => [...list.slice(-3), entry]);
        setTimeout(() => setHurts((list) => list.filter((x) => x.id !== entry.id)), 900);
      },
      notice: (message) => {
        setNotice(message);
        clearTimeout(noticeTimer.current);
        noticeTimer.current = setTimeout(() => setNotice(""), 2200);
      },
    }, initialSettings);
    controller.current = c;
    return () => { c.dispose(); controller.current = null; clearTimeout(noticeTimer.current); };
  }, [id, initialSettings]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.code === "Tab") { e.preventDefault(); setScore(true); } };
    const up = (e: KeyboardEvent) => { if (e.code === "Tab") setScore(false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const update = useCallback((next: Partial<Settings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...next };
      save(STORE, JSON.stringify(merged));
      return merged;
    });
    controller.current?.setSettings(next);
  }, []);

  const start = useCallback(async (mode: "quick" | "create" | "code") => {
    const c = controller.current;
    if (!c || busy) return;
    setBusy(true);
    save(HERO_KEY, hero);
    const reply = await c.join({ name: guest?.name ?? "Player", hero, mode, code: mode === "code" ? code.trim().toUpperCase() : undefined });
    setBusy(false);
    if (reply.ok) c.requestLock();
  }, [busy, code, guest, hero]);

  const playing = ui?.stage === "playing";
  const me = ui?.roster.find((p) => p.slot === ui.slot);
  const teamName = ui ? TEAM_NAMES[ui.team] : "ember";
  const weapon = ui ? WEAPONS[WEAPON_IDS[ui.weapon] ?? "pulse"] : WEAPONS.pulse;
  const mag = ui ? ui.ammo[ui.weapon] ?? 0 : 0;

  const touchMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = e.touches[0];
    const x = ((t.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((t.clientY - rect.top) / rect.height - 0.5) * 2;
    controller.current?.touchMove(Math.max(-1, Math.min(1, x * 1.4)), Math.max(-1, Math.min(1, -y * 1.4)));
  };
  const lastLook = useRef<{ x: number; y: number } | null>(null);
  const touchLook = (e: ReactTouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    if (lastLook.current) controller.current?.touchLook(t.clientX - lastLook.current.x, t.clientY - lastLook.current.y);
    lastLook.current = { x: t.clientX, y: t.clientY };
  };
  const hold = (down: () => void, up: () => void) => ({
    onTouchStart: (e: ReactTouchEvent) => { e.preventDefault(); down(); },
    onTouchEnd: (e: ReactTouchEvent) => { e.preventDefault(); up(); },
    onTouchCancel: () => up(),
  });

  const rosterSorted = [...(ui?.roster ?? [])].sort((a, b) => b.score - a.score);
  const board = (team: 0 | 1) => rosterSorted.filter((p) => p.team === team);

  return (
    <RotateGate game="MindBop Arena">
    <main className={`${styles.arena} ${playing ? styles.live : ""}`} data-team={teamName}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="MindBop Arena first-person combat map" />
      <MobileLandscapeGate game="MindBop Arena" />

      {!playing && (
        <section className={styles.menu} aria-label="Arena lobby">
          <div className={styles.menuCard}>
            <header>
              <span className={styles.eyebrow}><Wifi size={14} /> {ui?.connected ? "Online" : connectionError || "Connecting…"}</span>
              <h1>MindBop Arena</h1>
              <p>Fast 6v6 first-person team combat. Pick a hero and drop into a match. Arenas fill automatically.</p>
            </header>
            <div className={styles.heroes} role="radiogroup" aria-label="Choose your hero">
              {HERO_IDS.map((h) => (
                <button key={h} role="radio" aria-checked={hero === h} className={hero === h ? styles.heroOn : ""} onClick={() => { setHero(h); controller.current?.setHero(h); }}>
                  <b>{HEROES[h].label}</b><small>{HEROES[h].detail}</small>
                  <i>{HEROES[h].maxHp} HP</i>
                </button>
              ))}
            </div>
            <div className={styles.playRow}>
              <button className={styles.primary} disabled={!ui?.connected || busy} onClick={() => void start("quick")}>
                <Crosshair /> {busy ? "Finding an arena…" : "Quick play"}
              </button>
              <button disabled={!ui?.connected || busy} onClick={() => void start("create")}><Users /> Private room</button>
            </div>
            <form className={styles.codeRow} onSubmit={(e) => { e.preventDefault(); void start("code"); }}>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="Room code" aria-label="Room code" inputMode="text" autoComplete="off" />
              <button disabled={code.length !== 6 || !ui?.connected || busy}>Join</button>
            </form>
            {ui?.error && <p className={styles.error} role="alert">{ui.error}</p>}
            <p className={styles.keys}>WASD move · Shift sprint · Space jump · Mouse aim · Click fire · Right-click aim down sights · R reload · 1–4 weapons · Q/E/F ability · Tab scoreboard</p>
            <p className={styles.maps}>Maps: {MAP_IDS.map((m) => getMap(m).name).join(" · ")}</p>
          </div>
        </section>
      )}

      {playing && ui && (
        <>
          <div className={styles.top}>
            <div className={`${styles.teamScore} ${styles.ember}`}><b>{ui.scores[0]}</b><small>EMBER</small></div>
            <div className={styles.clock}>
              <strong>{ui.phase === "live" ? clock(ui.timeLeftMs) : ui.phase === "countdown" ? `Starts in ${Math.ceil(ui.timeLeftMs / 1000)}` : ui.phase === "ended" ? "Match over" : "Waiting for players"}</strong>
              <small>{getMap(ui.mapId).name} · first to {ui.killLimit}{ui.code ? ` · room ${ui.code}` : ""}</small>
            </div>
            <div className={`${styles.teamScore} ${styles.azure}`}><b>{ui.scores[1]}</b><small>AZURE</small></div>
          </div>

          <ul className={styles.feed} aria-live="polite">
            {ui.feed.map((f) => (
              <li key={f.id} className={f.mine ? styles.feedMine : f.me ? styles.feedMe : ""}>
                <b>{f.killer}</b> <span>{WEAPONS[WEAPON_IDS[f.weapon] ?? "pulse"].label}{f.head ? " · headshot" : ""}</span> <b>{f.victim}</b>
              </li>
            ))}
          </ul>

          <div className={styles.crosshair} aria-hidden="true"><span /><span /><span /><span /></div>
          {hit.key > 0 && <div key={hit.key} className={`${styles.hitMarker} ${hit.kill ? styles.hitKill : hit.head ? styles.hitHead : ""}`} aria-hidden="true" />}
          {hurts.map((h) => <div key={h.id} className={styles.hurt} style={{ transform: `rotate(${h.angle}rad)` }} aria-hidden="true" />)}

          <div className={styles.vitals}>
            <div className={styles.hpBar} role="meter" aria-label="Health" aria-valuenow={ui.hp} aria-valuemax={ui.maxHp}>
              <i style={{ width: `${Math.max(0, Math.min(100, (ui.hp / ui.maxHp) * 100))}%` }} />
              <b>{Math.max(0, Math.round(ui.hp))}</b>
            </div>
            <div className={styles.hero}>
              <span>{HEROES[ui.hero].label}</span>
              <button className={ui.abilityMs > 0 ? styles.abilityCool : styles.abilityReady} onClick={() => controller.current?.tapAbility()} aria-label="Use ability">
                {ui.hero === "warden" ? <Shield /> : <Zap />}{ui.abilityMs > 0 ? `${(ui.abilityMs / 1000).toFixed(1)}s` : "READY"}
              </button>
            </div>
          </div>

          <div className={styles.weapons}>
            <div className={styles.ammo}><b>{mag}</b><small>/ {weapon.mag}</small>{ui.reloadMs > 0 && <em>RELOADING</em>}</div>
            {WEAPON_IDS.map((w, i) => (
              <button key={w} className={ui.weapon === i ? styles.weaponOn : ""} onClick={() => controller.current?.selectWeapon(i)} aria-label={`Select ${WEAPONS[w].label}`}>
                <kbd>{i + 1}</kbd><span>{WEAPONS[w].label}</span><small>{ui.ammo[i]}</small>
              </button>
            ))}
          </div>

          {notice && <div className={styles.notice} role="status">{notice}</div>}
          {!ui.alive && ui.phase !== "ended" && (
            <div className={styles.respawn}><Skull /><strong>{ui.respawnMs > 0 ? `Respawning in ${Math.ceil(ui.respawnMs / 1000)}` : "Get ready…"}</strong></div>
          )}
          {ui.phase === "waiting" && <div className={styles.banner}>Waiting for another player… share the room code or hang tight, arenas fill automatically.</div>}
          {ui.phase === "countdown" && <div className={styles.banner}>Warm-up: movement only. The fight starts in {Math.ceil(ui.timeLeftMs / 1000)}.</div>}

          {(score || ui.phase === "ended") && (
            <div className={styles.board} role="dialog" aria-label="Scoreboard">
              {ui.phase === "ended" && (
                <h2>{ui.winner === 2 ? "Draw" : ui.winner === ui.team ? "VICTORY" : "DEFEAT"}<small> · next match in {Math.ceil(ui.timeLeftMs / 1000)}s</small></h2>
              )}
              <div className={styles.boardGrid}>
                {([0, 1] as const).map((t) => (
                  <table key={t} className={t === 0 ? styles.ember : styles.azure}>
                    <thead><tr><th>{TEAM_NAMES[t].toUpperCase()} · {ui.scores[t]}</th><th>K</th><th>D</th><th>Score</th></tr></thead>
                    <tbody>{board(t).map((p) => (
                      <tr key={`${p.slot}-${p.gen}`} className={p.slot === ui.slot ? styles.you : ""}>
                        <td>{p.name}{!p.connected ? " (away)" : ""} <small>{HEROES[p.hero].label}</small></td><td>{p.kills}</td><td>{p.deaths}</td><td>{p.score}</td>
                      </tr>))}
                    </tbody>
                  </table>
                ))}
              </div>
            </div>
          )}

          {!ui.locked && ui.phase !== "ended" && (
            <div className={styles.pause}>
              <aside>
                <h2>{ui.alive || ui.respawnMs > 0 ? "Paused" : "Arena"}</h2>
                <button className={styles.primary} onClick={() => controller.current?.requestLock()}><Crosshair /> Click to play <small>Esc to release the cursor</small></button>
                <div className={styles.heroes}>
                  {HERO_IDS.map((h) => (
                    <button key={h} className={me?.hero === h ? styles.heroOn : ""} onClick={() => { setHero(h); save(HERO_KEY, h); controller.current?.setHero(h); }}>
                      <b>{HEROES[h].label}</b><small>{HEROES[h].detail}</small>
                    </button>
                  ))}
                </div>
                <p className={styles.hint}>A new hero takes effect when you respawn.</p>
                <div className={styles.row}>
                  <button onClick={() => setSettingsOpen((v) => !v)}><Settings2 /> Settings</button>
                  <button onClick={() => void document.documentElement.requestFullscreen?.()}><Maximize2 /> Fullscreen</button>
                  <button className={styles.danger} onClick={() => controller.current?.leave()}><LogOut /> Leave</button>
                </div>
                {settingsOpen && (
                  <div className={styles.settings}>
                    <label>Mouse sensitivity <b>{settings.sensitivity.toFixed(2)}×</b><input type="range" min="0.2" max="3" step="0.05" value={settings.sensitivity} onChange={(e) => update({ sensitivity: Number(e.target.value) })} /></label>
                    <label>Field of view <b>{settings.fov}°</b><input type="range" min="60" max="110" step="1" value={settings.fov} onChange={(e) => update({ fov: Number(e.target.value) })} /></label>
                    <label>Volume <b>{Math.round(settings.volume * 100)}%</b><input type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={(e) => update({ volume: Number(e.target.value) })} /></label>
                    <div>Graphics (applies on next join)
                      <div className={styles.quality}>
                        {(["auto", "low", "high", "ultra"] as const).map((q) => <button key={q} className={settings.quality === q ? styles.heroOn : ""} onClick={() => update({ quality: q })}>{q}</button>)}
                      </div>
                    </div>
                  </div>
                )}
                <div className={styles.info}><span>PING <b>{ui.ping || "—"}ms</b></span><span>FPS <b>{ui.fps || "—"}</b></span><span>PLAYERS <b>{ui.roster.length}</b></span></div>
              </aside>
            </div>
          )}

          <div className={styles.touch} aria-hidden="true">
            <div className={styles.stick} onTouchStart={touchMove} onTouchMove={touchMove} onTouchEnd={() => controller.current?.touchMove(0, 0)}><span /></div>
            <div className={styles.lookPad} onTouchStart={(e) => { lastLook.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchMove={touchLook} onTouchEnd={() => { lastLook.current = null; }} />
            <div className={styles.touchButtons}>
              {/* eslint-disable react-hooks/refs -- handlers only read the ref when a touch fires, never during render */}
              <button {...hold(() => controller.current?.setFire(true), () => controller.current?.setFire(false))}>FIRE</button>
              <button {...hold(() => controller.current?.tapJump(), () => undefined)}>JUMP</button>
              <button {...hold(() => controller.current?.tapAbility(), () => undefined)}>SKILL</button>
              <button {...hold(() => controller.current?.tapReload(), () => undefined)}><RotateCcw size={16} /></button>
              <button {...hold(() => controller.current?.setAds(true), () => controller.current?.setAds(false))}>AIM</button>
              <button onClick={() => controller.current?.leave()} aria-label="Leave match"><X size={16} /></button>
              {/* eslint-enable react-hooks/refs */}
            </div>
          </div>
        </>
      )}
    </main>
    </RotateGate>
  );
}
