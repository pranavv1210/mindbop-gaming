"use client";
import { useEffect, useRef, useState } from "react";
import { Crosshair, LogOut, Maximize2, Shield, Zap } from "lucide-react";
import { useGame } from "@/components/game-provider";
import type { RoomView } from "@/lib/protocol";
import type { ArenaScene } from "./arena-scene";
import type { ArenaHero, ArenaView, ArenaWeapon } from "./types";
import styles from "./arena.module.css";

const weapons: { id: ArenaWeapon; label: string; hint: string }[] = [
  { id: "pulse", label: "Pulse", hint: "balanced" },
  { id: "scatter", label: "Scatter", hint: "close range" },
  { id: "rail", label: "Rail", hint: "precision" },
];
const heroes: { id: ArenaHero; label: string; detail: string }[] = [
  { id: "striker", label: "Striker", detail: "dash · agile" },
  { id: "warden", label: "Warden", detail: "armor · durable" },
  { id: "ghost", label: "Ghost", detail: "speed · fragile" },
  { id: "medic", label: "Medic", detail: "heal · sustain" },
];

export function ArenaGame({ room, leave }: { room: RoomView<ArenaView>; leave: () => void }) {
  const { id, move, send } = useGame();
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<ArenaScene | null>(null);
  const latest = useRef(room.game!);
  const keys = useRef(new Set<string>());
  const [locked, setLocked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [weapon, setWeapon] = useState<ArenaWeapon>("pulse");
  const [hero, setHero] = useState<ArenaHero>("striker");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { latest.current = room.game!; scene.current?.update(room.game!); }, [room]);
  useEffect(() => {
    let disposed = false; let current: ArenaScene | null = null;
    import("./arena-scene").then(({ createArenaScene }) => {
      if (disposed || !canvas.current) return;
      current = createArenaScene(canvas.current, id); scene.current = current; current.update(latest.current); setLoaded(true);
    });
    return () => { disposed = true; current?.dispose(); scene.current = null; };
  }, [id]);

  const fire = () => {
    if (document.pointerLockElement !== canvas.current) return;
    const aim = scene.current?.getAim();
    if (!aim) return;
    scene.current?.fire();
    void send({ type: "game", action: { type: "shoot", weapon, ...aim } });
  };
  const chooseWeapon = (next: ArenaWeapon) => { setWeapon(next); scene.current?.setWeapon(next); void send({ type: "game", action: { type: "weapon", weapon: next } }); };
  const chooseHero = (next: ArenaHero) => { setHero(next); void send({ type: "game", action: { type: "hero", hero: next } }); };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Escape") { setMenuOpen(false); return; }
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "Space", "Digit1", "Digit2", "Digit3", "KeyF"].includes(e.code)) e.preventDefault();
      if (e.code === "Digit1") chooseWeapon("pulse");
      if (e.code === "Digit2") chooseWeapon("scatter");
      if (e.code === "Digit3") chooseWeapon("rail");
      if (e.code === "KeyF" && document.pointerLockElement === canvas.current) void send({ type: "game", action: { type: "ability" } });
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "Space"].includes(e.code)) keys.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const mouse = (e: MouseEvent) => { if (document.pointerLockElement === canvas.current) scene.current?.look(e.movementX, e.movementY); };
    const lock = () => setLocked(document.pointerLockElement === canvas.current);
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("mousemove", mouse); window.addEventListener("mousedown", fire); document.addEventListener("pointerlockchange", lock);
    const timer = setInterval(() => { const k = keys.current; move((k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0), (k.has("KeyW") ? 1 : 0) - (k.has("KeyS") ? 1 : 0), k.has("Space"), k.has("ShiftLeft")); k.delete("Space"); }, 40);
    return () => { clearInterval(timer); move(0, 0); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("mousemove", mouse); window.removeEventListener("mousedown", fire); document.removeEventListener("pointerlockchange", lock); };
  }, [move, send, weapon]);

  const game = room.game!; const me = game.players[id];
  const teamScore = me?.team === "ember" ? game.scores.ember : game.scores.azure;
  const enemyScore = me?.team === "ember" ? game.scores.azure : game.scores.ember;
  return (
    <section className={styles.arena}>
      <canvas ref={canvas} className={styles.canvas} aria-label="MindBop Arena first-person combat map" />
      <div className={styles.topbar}>
        <div className={styles.brand}><span className={styles.liveDot} /> <strong>MINDBOP ARENA</strong><small>NEON DISTRICT</small></div>
        <div className={styles.score}><span className={styles.ember}>{teamScore}</span><b>—</b><span className={styles.azure}>{enemyScore}</span><small>CAPTURE ZONE</small></div>
        <div className={styles.topActions}><span>{Math.ceil(game.timeLeft)}s</span><button onClick={() => canvas.current?.requestFullscreen()} title="Fullscreen"><Maximize2 /></button><button onClick={() => setMenuOpen((v) => !v)} aria-label="Open arena menu">•••</button></div>
      </div>
      <div className={styles.leftHud}><div className={styles.stat}><span>ARMOR</span><b>{Math.max(0, Math.round(me?.hp ?? 0))}</b><i><span style={{ width: `${Math.max(0, Math.min(100, me ? (me.hp / me.maxHp) * 100 : 0))}%` }} /></i></div><div className={styles.stat}><span>K / D</span><b>{me?.kills ?? 0} / {me?.deaths ?? 0}</b></div></div>
      <div className={styles.zoneHud}><span className={styles.zonePulse} /> ZONE {game.zone.owner ? `CONTROLLED BY ${game.zone.owner.toUpperCase()}` : "CONTESTED"}<strong>{Math.round(game.zone.progress)}%</strong></div>
      <Crosshair className={styles.crosshair} />
      <div className={styles.weaponBar}>{weapons.map((item, index) => <button key={item.id} className={weapon === item.id ? styles.weaponActive : ""} onClick={() => chooseWeapon(item.id)}><kbd>{index + 1}</kbd><b>{item.label}</b><small>{item.hint}</small></button>)}</div>
      <div className={styles.heroBar}>{heroes.map((item) => <button key={item.id} className={hero === item.id ? styles.heroActive : ""} onClick={() => chooseHero(item.id)}><b>{item.label}</b><small>{item.detail}</small></button>)}<button className={styles.ability} onClick={() => void send({ type: "game", action: { type: "ability" } })}><Zap /><span>F</span></button></div>
      {!locked && <button className={styles.enter} disabled={!loaded} onClick={() => canvas.current?.requestPointerLock()}><Crosshair />{loaded ? "Enter the arena" : "Loading arena…"}<small>WASD move · Shift sprint · Space jump · Mouse aim · Click fire · F ability</small></button>}
      {menuOpen && <aside className={styles.menu}><button onClick={() => setMenuOpen(false)}>Resume</button><div><b>Loadout</b><span>{heroes.find((h) => h.id === hero)?.label} · {weapons.find((w) => w.id === weapon)?.label}</span></div><div><b>Room</b><span>{room.code} · {room.players.length}/10 players</span></div><button onClick={leave} className={styles.leave}><LogOut /> Leave match</button></aside>}
      <footer className={styles.footer}><span>ROOM {room.code}</span><span>{locked ? "ESC releases cursor" : "Pointer free"}</span><span><Shield /> server authoritative</span></footer>
    </section>
  );
}
