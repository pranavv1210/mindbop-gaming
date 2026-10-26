"use client";
import { useEffect, useRef, useState } from "react";
import type { TouchEvent } from "react";
import { Crosshair, Gamepad2, LogOut, Maximize2, Shield, Target, Wifi, Zap } from "lucide-react";
import { useGame } from "@/components/game-provider";
import type { RoomView } from "@/lib/protocol";
import type { ArenaScene } from "./arena-scene";
import type { ArenaCardId, ArenaHero, ArenaView, ArenaWeapon } from "./types";
import { ARENA_CARDS } from "./config";
import styles from "./arena.module.css";

const weapons: { id: ArenaWeapon; label: string; hint: string }[] = [
  { id: "pulse", label: "Pulse", hint: "balanced" },
  { id: "scatter", label: "Scatter", hint: "close range" },
  { id: "rail", label: "Rail", hint: "precision" },
];
const heroes: { id: ArenaHero; label: string; detail: string }[] = [
  { id: "striker", label: "Striker", detail: "dash · agile" },
  { id: "warden", label: "Warden", detail: "shield · tank" },
  { id: "ghost", label: "Ghost", detail: "cloak · speed" },
  { id: "medic", label: "Medic", detail: "heal · sustain" },
];
const cardMeta: Record<ArenaCardId, { label: string; detail: string }> = {
  overclock: { label: ARENA_CARDS.overclock.label, detail: ARENA_CARDS.overclock.detail },
  bulwark: { label: ARENA_CARDS.bulwark.label, detail: ARENA_CARDS.bulwark.detail },
  ghoststep: { label: ARENA_CARDS.ghoststep.label, detail: ARENA_CARDS.ghoststep.detail },
  sharpshot: { label: ARENA_CARDS.sharpshot.label, detail: ARENA_CARDS.sharpshot.detail },
};

export function ArenaGame({ room, leave }: { room: RoomView<ArenaView>; leave: () => void }) {
  const { id, move, send } = useGame();
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<ArenaScene | null>(null);
  const latest = useRef(room.game!);
  const keys = useRef(new Set<string>());
  const touchVector = useRef({ x: 0, z: 0 });
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);
  const serverOffset = useRef(room.serverTime - Date.now());
  const [locked, setLocked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [weapon, setWeapon] = useState<ArenaWeapon>("pulse");
  const [hero, setHero] = useState<ArenaHero>("striker");
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiming, setAiming] = useState(false);
  const [fps, setFps] = useState(0);
  const [quality, setQuality] = useState(() => typeof window === "undefined" ? "auto" : localStorage.getItem("mindbop-arena-quality") ?? "auto");

  useEffect(() => {
    latest.current = room.game!;
    serverOffset.current = room.serverTime - Date.now();
    scene.current?.update(room.game!);
    if (room.game?.finished && document.pointerLockElement) document.exitPointerLock();
  }, [room]);

  useEffect(() => {
    let disposed = false;
    let current: ArenaScene | null = null;
    import("./arena-scene").then(({ createArenaScene }) => {
      if (disposed || !canvas.current) return;
      current = createArenaScene(canvas.current, id);
      scene.current = current;
      current.setWeapon(weapon);
      current.update(latest.current);
      setLoaded(true);
    });
    return () => { disposed = true; current?.dispose(); scene.current = null; };
  }, [id]);

  useEffect(() => {
    let frames = 0;
    let previous = performance.now();
    let raf = 0;
    const sample = (now: number) => {
      frames += 1;
      if (now - previous >= 1000) { setFps(Math.round(frames * 1000 / (now - previous))); frames = 0; previous = now; }
      raf = requestAnimationFrame(sample);
    };
    raf = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(raf);
  }, []);

  const fire = () => {
    const isDesktop = document.pointerLockElement === canvas.current;
    if (!isDesktop && !matchMedia("(pointer: coarse)").matches) return;
    const aim = scene.current?.getAim();
    if (!aim || latest.current.finished) return;
    scene.current?.fire();
    const shotAt = Date.now() + serverOffset.current;
    void send({ type: "game", action: { type: "shoot", weapon, shotAt, ...aim } });
  };
  const chooseWeapon = (next: ArenaWeapon) => { setWeapon(next); scene.current?.setWeapon(next); void send({ type: "game", action: { type: "weapon", weapon: next } }); };
  const chooseHero = (next: ArenaHero) => { setHero(next); scene.current?.setHero(next); void send({ type: "game", action: { type: "hero", hero: next } }); };
  const ability = () => void send({ type: "game", action: { type: "ability" } });
  const chooseCard = (card: ArenaCardId) => void send({ type: "game", action: { type: "card", card } });
  const changeQuality = (next: string) => { setQuality(next); localStorage.setItem("mindbop-arena-quality", next); window.location.reload(); };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Escape") { setMenuOpen(false); return; }
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "Space", "Digit1", "Digit2", "Digit3", "KeyF"].includes(e.code)) e.preventDefault();
      if (e.code === "Digit1") chooseWeapon("pulse"); if (e.code === "Digit2") chooseWeapon("scatter"); if (e.code === "Digit3") chooseWeapon("rail");
      if (e.code === "KeyF" && document.pointerLockElement === canvas.current) ability();
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "Space"].includes(e.code)) keys.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const mouse = (e: MouseEvent) => { if (document.pointerLockElement === canvas.current) scene.current?.look(e.movementX, e.movementY); };
    const mouseDown = (e: MouseEvent) => { if (e.button === 0) fire(); if (e.button === 2) { e.preventDefault(); setAiming(true); scene.current?.setAimMode(true); } };
    const mouseUp = (e: MouseEvent) => { if (e.button === 2) { setAiming(false); scene.current?.setAimMode(false); } };
    const lock = () => setLocked(document.pointerLockElement === canvas.current);
    const context = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("mousemove", mouse); window.addEventListener("mousedown", mouseDown); window.addEventListener("mouseup", mouseUp); window.addEventListener("contextmenu", context); document.addEventListener("pointerlockchange", lock);
    const timer = setInterval(() => {
      const k = keys.current;
      const x = ((k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0)) + touchVector.current.x;
      const z = ((k.has("KeyW") ? 1 : 0) - (k.has("KeyS") ? 1 : 0)) + touchVector.current.z;
      const sprint = k.has("ShiftLeft");
      move(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, z)), k.has("Space"), sprint);
      scene.current?.setInput(x, z, sprint); k.delete("Space");
    }, 40);
    return () => { clearInterval(timer); move(0, 0); scene.current?.setInput(0, 0, false); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("mousemove", mouse); window.removeEventListener("mousedown", mouseDown); window.removeEventListener("mouseup", mouseUp); window.removeEventListener("contextmenu", context); document.removeEventListener("pointerlockchange", lock); };
  }, [move, send, weapon]);

  const game = room.game!;
  const me = game.players[id];
  const teamScore = me?.team === "ember" ? game.scores.ember : game.scores.azure;
  const enemyScore = me?.team === "ember" ? game.scores.azure : game.scores.ember;
  const abilityReady = me ? Math.max(0, (me.abilityReadyAt - room.serverTime) / 1000) : 0;
  const stamina = me?.stamina ?? 100;
  const pendingCards = me?.pendingCards ?? [];

  const touchStart = (e: TouchEvent<HTMLDivElement>) => { const touch = e.changedTouches[0]; touchOrigin.current = { x: touch.clientX, y: touch.clientY }; };
  const touchMove = (e: TouchEvent<HTMLDivElement>) => { const origin = touchOrigin.current; if (!origin) return; const touch = e.changedTouches[0]; touchVector.current = { x: Math.max(-1, Math.min(1, (touch.clientX - origin.x) / 55)), z: Math.max(-1, Math.min(1, -(touch.clientY - origin.y) / 55)) }; };
  const touchEnd = () => { touchOrigin.current = null; touchVector.current = { x: 0, z: 0 }; };

  return <section className={styles.arena}>
    <canvas ref={canvas} className={styles.canvas} aria-label="MindBop Arena first-person combat map" />
    <div className={styles.topbar}><div className={styles.brand}><span className={styles.liveDot} /><strong>MINDBOP ARENA</strong><small>{game.mapId.replace("-", " ").toUpperCase()}</small></div><div className={styles.score}><span className={styles.ember}>{teamScore}</span><b>—</b><span className={styles.azure}>{enemyScore}</span><small>CAPTURE ZONE</small></div><div className={styles.topActions}><span>{Math.ceil(game.timeLeft)}s</span><span className={styles.connection}><Wifi /> LIVE</span><button onClick={() => canvas.current?.requestFullscreen()} title="Fullscreen"><Maximize2 /></button><button onClick={() => setMenuOpen((v) => !v)} aria-label="Open arena menu">•••</button></div></div>
    <div className={styles.leftHud}><div className={styles.stat}><span>ARMOR</span><b>{Math.max(0, Math.round(me?.hp ?? 0))}<small> / {me?.maxHp ?? 0}</small></b><i><span style={{ width: `${Math.max(0, Math.min(100, me ? (me.hp / me.maxHp) * 100 : 0))}%` }} /></i></div><div className={styles.stat}><span>K / D</span><b>{me?.kills ?? 0} / {me?.deaths ?? 0}</b></div><div className={styles.stat}><span>FPS</span><b>{fps || "—"}</b></div></div>
    <div className={styles.zoneHud}><span className={styles.zonePulse} /> {game.zone.owner ? `${game.zone.owner.toUpperCase()} CONTROLS` : "ZONE CONTESTED"}<strong>{Math.round(game.zone.progress)}%</strong></div>
    <div className={styles.crosshair} aria-hidden="true"><span /><span /></div>
    <div className={styles.weaponBar}>{weapons.map((item, index) => <button key={item.id} className={weapon === item.id ? styles.weaponActive : ""} onClick={() => chooseWeapon(item.id)}><kbd>{index + 1}</kbd><b>{item.label}</b><small>{item.hint}</small></button>)}</div>
    <div className={styles.heroBar}>{heroes.map((item) => <button key={item.id} className={hero === item.id ? styles.heroActive : ""} onClick={() => chooseHero(item.id)}><b>{item.label}</b><small>{item.detail}</small></button>)}<button className={styles.ability} onClick={ability}><Zap /><span>{abilityReady > 0 ? `${abilityReady.toFixed(1)}s` : "F"}</span></button></div>
    <div className={styles.touchHud} onTouchStart={touchStart} onTouchMove={touchMove} onTouchEnd={touchEnd}><div className={styles.joystick}><span /></div><div className={styles.touchActions}><button onTouchStart={(e) => { e.preventDefault(); fire(); }}><Target />FIRE</button><button onTouchStart={(e) => { e.preventDefault(); ability(); }}><Zap />ABILITY</button><button onTouchStart={(e) => { e.preventDefault(); setAiming(true); scene.current?.setAimMode(true); }} onTouchEnd={() => { setAiming(false); scene.current?.setAimMode(false); }}><Gamepad2 />AIM</button></div></div>
    <div className={styles.stamina}><span>STAMINA</span><i><span style={{ width: `${stamina}%` }} /></i></div>
    {!locked && !game.finished && <button className={styles.enter} disabled={!loaded} onClick={() => canvas.current?.requestPointerLock()}><Crosshair />{loaded ? "Enter the arena" : "Loading arena…"}<small>WASD · Shift · Space · Mouse · Click · F</small></button>}
    {pendingCards.length > 0 && !game.finished && <div className={styles.cardOverlay}><div className={styles.cardPanel}><span className={styles.cardEyebrow}>ZONE CAPTURED · UPGRADE READY</span><h2>Choose your edge</h2><p>Pick one permanent upgrade for this match.</p><div className={styles.cardGrid}>{pendingCards.map((card) => <button key={card} className={styles.cardChoice} onClick={() => chooseCard(card)}><strong>{cardMeta[card].label}</strong><span>{cardMeta[card].detail}</span><em>SELECT</em></button>)}</div></div></div>}
    {game.finished && <div className={styles.resultOverlay}><div className={styles.resultPanel}><span>ARENA COMPLETE</span><h1>{game.winner === me?.team ? "VICTORY" : "DEFEAT"}</h1><div className={styles.resultScore}><b>{teamScore}</b><span>—</span><b>{enemyScore}</b></div><p>{game.mapId.replace("-", " ").toUpperCase()} · {me?.kills ?? 0} KILLS · {me?.score ?? 0} SCORE</p><button onClick={leave}><LogOut /> Return to lobby</button></div></div>}
    {menuOpen && <aside className={styles.menu}><button onClick={() => setMenuOpen(false)}>Resume</button><div><b>Loadout</b><span>{heroes.find((h) => h.id === hero)?.label} · {weapons.find((w) => w.id === weapon)?.label}</span></div><div><b>Quality</b><span className={styles.qualityRow}>{["auto", "low", "high", "ultra"].map((item) => <button key={item} className={quality === item ? styles.qualityActive : ""} onClick={() => changeQuality(item)}>{item}</button>)}</span></div><div><b>Room</b><span>{room.code} · {room.players.length}/10 players</span></div><button onClick={leave} className={styles.leave}><LogOut /> Leave match</button></aside>}
    <footer className={styles.footer}><span>ROOM {room.code}</span><span>{aiming ? "ADS" : locked ? "ESC releases cursor" : "Pointer free"}</span><span><Shield /> server authoritative</span></footer>
  </section>;
}
