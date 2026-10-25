"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Crosshair,
  Heart,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { GameFullscreen } from "@/components/game-fullscreen";

function useBest(key: string) {
  const [best, setBest] = useState(0);
  useEffect(() => {
    // Browser-only score restoration after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBest(Number(localStorage.getItem(key) ?? 0));
  }, [key]);
  const save = useCallback(
    (score: number) => {
      setBest((current) => {
        const next = Math.max(current, score);
        localStorage.setItem(key, String(next));
        return next;
      });
    },
    [key],
  );
  return [best, save] as const;
}
function Header({
  title,
  score,
  best,
}: {
  title: string;
  score: number;
  best: number;
}) {
  return (
    <header className="solo-header">
      <Link href="/play">
        <ArrowLeft /> Game hub
      </Link>
      <div>
        <small>{title}</small>
        <strong>{score.toLocaleString()}</strong>
      </div>
      <div>
        <small>Personal best</small>
        <strong>{best.toLocaleString()}</strong>
      </div>
    </header>
  );
}

function NeonBreach() {
  const [phase, setPhase] = useState<"idle" | "running" | "over">("idle"),
    [score, setScore] = useState(0),
    [combo, setCombo] = useState(0),
    [lives, setLives] = useState(3),
    [time, setTime] = useState(30),
    [target, setTarget] = useState({ x: 50, y: 50, key: 0 });
  const born = useRef(0);
  const [best, saveBest] = useBest("mindbop_neon_best");
  const spawn = useCallback(() => {
    born.current = performance.now();
    setTarget({
      x: 10 + Math.random() * 80,
      y: 14 + Math.random() * 70,
      key: Math.random(),
    });
  }, []);
  const finish = useCallback(
    () =>
      setPhase((current) => {
        if (current === "running") saveBest(score);
        return "over";
      }),
    [saveBest, score],
  );
  useEffect(() => {
    if (phase !== "running") return;
    const timer = setInterval(() => {
      setTime((value) => {
        if (value <= 0.05) {
          finish();
          return 0;
        }
        return value - 0.05;
      });
      if (performance.now() - born.current > Math.max(420, 950 - score * 1.2)) {
        setLives((value) => {
          if (value <= 1) {
            finish();
            return 0;
          }
          return value - 1;
        });
        setCombo(0);
        spawn();
      }
    }, 50);
    return () => clearInterval(timer);
  }, [phase, finish, score, spawn]);
  function start() {
    setScore(0);
    setCombo(0);
    setLives(3);
    setTime(30);
    setPhase("running");
    spawn();
  }
  function hit() {
    if (phase !== "running") return;
    const speed = Math.max(0, 900 - (performance.now() - born.current));
    const nextCombo = combo + 1;
    setCombo(nextCombo);
    setScore(
      (value) =>
        value + 100 + Math.round(speed / 5) + Math.min(500, nextCombo * 20),
    );
    spawn();
  }
  return (
    <div className="neon-world">
      <Header title="Neon Breach" score={score} best={best} />
      <section className="breach-stage">
        <div className="breach-grid" />
        <div className="breach-hud">
          <span>
            <Crosshair /> Combo <b>{combo}×</b>
          </span>
          <span>
            {[0, 1, 2].map((i) => (
              <Heart key={i} className={i < lives ? "alive" : ""} />
            ))}
          </span>
          <strong>{time.toFixed(1)}s</strong>
        </div>
        {phase === "running" && (
          <button
            key={target.key}
            className="breach-target"
            style={{
              left: `${target.x}%`,
              top: `${target.y}%`,
              width: Math.max(48, 88 - score / 120),
              height: Math.max(48, 88 - score / 120),
            }}
            onPointerDown={hit}
            aria-label="Hit signal"
          >
            <i />
            <span />
          </button>
        )}
        <div className="breach-vignette" />
        {phase !== "running" && (
          <div className="solo-overlay">
            <ShieldAlert />
            <small>
              {phase === "over"
                ? "Run terminated"
                : "System intrusion detected"}
            </small>
            <h1>
              {phase === "over"
                ? `${score.toLocaleString()} points`
                : "Breach the grid."}
            </h1>
            <p>
              Strike each unstable signal before it collapses. Speed builds your
              multiplier. Three misses end the run.
            </p>
            <button onClick={start}>
              <Play />
              {phase === "over" ? "Run it again" : "Initiate breach"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

const TONES = [
  "#24ecff",
  "#785cff",
  "#ff4fa3",
  "#ffb52e",
  "#54e58b",
  "#ff655f",
  "#b27aff",
  "#3b8cff",
  "#f5df4d",
  "#23c7b7",
  "#dc4fff",
  "#ff884d",
  "#7cf067",
  "#4ed4ff",
  "#f36bd4",
  "#f3f4ff",
];
function EchoGrid() {
  const [phase, setPhase] = useState<"idle" | "show" | "input" | "over">(
      "idle",
    ),
    [level, setLevel] = useState(0),
    [sequence, setSequence] = useState<number[]>([]),
    [entered, setEntered] = useState<number[]>([]),
    [active, setActive] = useState<number | null>(null),
    [strikes, setStrikes] = useState(0),
    [muted, setMuted] = useState(false);
  const timers = useRef<number[]>([]),
    seed = useRef(0x9e3779b9);
  const [best, saveBest] = useBest("mindbop_echo_best");
  const nextCell = () => {
    seed.current = (seed.current * 1664525 + 1013904223) >>> 0;
    return seed.current % 16;
  };
  const tone = useCallback(
    (index: number) => {
      if (muted) return;
      const AudioCtx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const context = new AudioCtx(),
        osc = context.createOscillator(),
        gain = context.createGain();
      osc.frequency.value = 220 + index * 34;
      gain.gain.setValueAtTime(0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
      osc.connect(gain).connect(context.destination);
      osc.start();
      osc.stop(context.currentTime + 0.18);
    },
    [muted],
  );
  const show = useCallback(
    (next: number[]) => {
      timers.current.forEach(clearTimeout);
      setPhase("show");
      setEntered([]);
      next.forEach((cell, i) => {
        timers.current.push(
          window.setTimeout(
            () => {
              setActive(cell);
              tone(cell);
            },
            500 + i * 520,
          ),
        );
        timers.current.push(
          window.setTimeout(() => setActive(null), 800 + i * 520),
        );
      });
      timers.current.push(
        window.setTimeout(() => setPhase("input"), 500 + next.length * 520),
      );
    },
    [tone],
  );
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  function start() {
    setLevel(1);
    setStrikes(0);
    const next = [nextCell()];
    setSequence(next);
    show(next);
  }
  function press(cell: number) {
    if (phase !== "input") return;
    const next = [...entered, cell];
    setActive(cell);
    tone(cell);
    window.setTimeout(() => setActive(null), 150);
    if (cell !== sequence[next.length - 1]) {
      const failures = strikes + 1;
      setStrikes(failures);
      if (failures >= 3) {
        saveBest(level);
        setPhase("over");
      } else show(sequence);
      return;
    }
    setEntered(next);
    if (next.length === sequence.length) {
      const newLevel = level + 1;
      setLevel(newLevel);
      saveBest(newLevel);
      const expanded = [...sequence, nextCell()];
      setSequence(expanded);
      window.setTimeout(() => show(expanded), 650);
    }
  }
  return (
    <div className="echo-world">
      <Header title="Echo Grid" score={level} best={best} />
      <section className="echo-stage">
        <div className="echo-status">
          <span>
            {phase === "show"
              ? "Observe"
              : phase === "input"
                ? `Your turn · ${entered.length}/${sequence.length}`
                : "Neural link idle"}
          </span>
          <strong>Level {level}</strong>
          <button
            onClick={() => setMuted((value) => !value)}
            aria-label={muted ? "Turn sound on" : "Mute sound"}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </button>
        </div>
        <div className="echo-board">
          {TONES.map((color, index) => (
            <button
              key={index}
              style={{ "--cell": color } as React.CSSProperties}
              className={active === index ? "active" : ""}
              disabled={phase !== "input"}
              onClick={() => press(index)}
              aria-label={`Pulse ${index + 1}`}
            >
              <i />
            </button>
          ))}
        </div>
        <div className="echo-strikes">
          Integrity{" "}
          {[0, 1, 2].map((i) => (
            <span key={i} className={i < strikes ? "lost" : ""} />
          ))}
        </div>
        {(phase === "idle" || phase === "over") && (
          <div className="solo-overlay">
            <Sparkles />
            <small>
              {phase === "over" ? "Neural link severed" : "Memory trial"}
            </small>
            <h1>
              {phase === "over"
                ? `Level ${level} reached`
                : "Trust your memory."}
            </h1>
            <p>
              Watch the pulse sequence, then repeat it exactly. Each level adds
              another signal. Three failures end the link.
            </p>
            <button onClick={start}>
              {phase === "over" ? <RotateCcw /> : <Play />}
              {phase === "over" ? "Reconnect" : "Enter the grid"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export function SoloArcade({ game }: { game: "neon-breach" | "echo-grid" }) {
  return (
    <main id="main" className="solo-shell">
      <GameFullscreen targetId="main" />
      {game === "neon-breach" ? <NeonBreach /> : <EchoGrid />}
    </main>
  );
}
