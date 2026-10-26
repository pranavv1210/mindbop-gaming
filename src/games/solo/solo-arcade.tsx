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

function randomCell(excluded: Set<number> = new Set()) {
  const available = TONES.map((_, index) => index).filter(
    (index) => !excluded.has(index),
  );
  if (available.length === 0) return Math.floor(Math.random() * TONES.length);

  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return available[values[0] % available.length];
  }
  return available[Math.floor(Math.random() * available.length)];
}

function createEchoSequence(length: number, prefix: number[] = []) {
  const safeLength = Math.max(1, Math.min(length, TONES.length));
  const sequence = [...prefix];
  const used = new Set(sequence);

  while (sequence.length < safeLength) {
    const cell = randomCell(used);
    sequence.push(cell);
    used.add(cell);
  }

  return sequence;
}

function EchoGrid() {
  const [phase, setPhase] = useState<"idle" | "show" | "input" | "over">(
      "idle",
    ),
    [level, setLevel] = useState(0),
    [sequence, setSequence] = useState<number[]>([]),
    [entered, setEntered] = useState<number[]>([]),
    [active, setActive] = useState<number | null>(null),
    [strikes, setStrikes] = useState(0),
    [muted, setMuted] = useState(false),
    [mistake, setMistake] = useState(false);
  const timers = useRef<number[]>([]);
  const [best, saveBest] = useBest("mindbop_echo_best");

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  const tone = useCallback(
    (index: number, success = false) => {
      if (muted) return;
      const AudioCtx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const context = new AudioCtx();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = success ? "sine" : "triangle";
      osc.frequency.value = success ? 360 + index * 24 : 220 + index * 34;
      gain.gain.setValueAtTime(0.07, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
      osc.connect(gain).connect(context.destination);
      osc.start();
      osc.stop(context.currentTime + 0.2);
      window.setTimeout(() => void context.close(), 250);
    },
    [muted],
  );

  const show = useCallback(
    (next: number[]) => {
      clearTimers();
      setPhase("show");
      setEntered([]);
      setActive(null);
      setMistake(false);

      const step = Math.max(330, 520 - Math.max(0, next.length - 4) * 12);
      const flash = Math.max(190, step * 0.58);

      next.forEach((cell, i) => {
        timers.current.push(
          window.setTimeout(
            () => {
              setActive(cell);
              tone(cell);
            },
            420 + i * step,
          ),
        );
        timers.current.push(
          window.setTimeout(() => setActive(null), 420 + i * step + flash),
        );
      });

      timers.current.push(
        window.setTimeout(
          () => {
            setActive(null);
            setPhase("input");
          },
          420 + next.length * step,
        ),
      );
    },
    [clearTimers, tone],
  );

  useEffect(() => () => clearTimers(), [clearTimers]);

  function start() {
    clearTimers();
    setLevel(1);
    setStrikes(0);
    setEntered([]);
    setActive(null);
    setMistake(false);
    // A new game gets a completely new trail. Once the game starts, that
    // trail remains the same and grows by one new cell after each success.
    const next = createEchoSequence(1);
    setSequence(next);
    show(next);
  }

  function press(cell: number) {
    if (phase !== "input") return;

    const expected = sequence[entered.length];
    const next = [...entered, cell];
    setActive(cell);
    timers.current.push(window.setTimeout(() => setActive(null), 150));
    tone(cell);

    if (cell !== expected) {
      const failures = strikes + 1;
      setStrikes(failures);
      setEntered([]);
      setMistake(true);
      timers.current.push(window.setTimeout(() => setMistake(false), 360));

      if (failures >= 3) {
        clearTimers();
        saveBest(level);
        setPhase("over");
        return;
      }

      // A mistake costs a strike, but the player must memorize the SAME trail
      // again. The sequence only changes when the entire game is lost/restarted.
      timers.current.push(window.setTimeout(() => show(sequence), 520));
      return;
    }

    setEntered(next);
    if (next.length === sequence.length) {
      const newLevel = level + 1;
      setLevel(newLevel);
      saveBest(newLevel);
      tone(cell, true);

      // Preserve the exact previous trail and append one new random cell.
      // This is the core Echo Grid mechanic: the trail grows; it does not
      // reshuffle during a single game.
      const expanded = createEchoSequence(
        Math.min(newLevel, TONES.length),
        sequence,
      );
      setSequence(expanded);
      timers.current.push(window.setTimeout(() => show(expanded), 650));
    }
  }

  return (
    <div className="echo-world echo-world-premium">
      <Header title="Echo Grid" score={level} best={best} />
      <section className={`echo-stage echo-stage-premium ${mistake ? "echo-mistake" : ""}`}>
        <div className="echo-aurora echo-aurora-one" />
        <div className="echo-aurora echo-aurora-two" />
        <div className="echo-stars" aria-hidden="true" />
        <div className="echo-scanline" aria-hidden="true" />

        <div className="echo-status echo-status-premium">
          <div className="echo-status-copy">
            <span className="echo-live-dot" />
            <div>
              <small>
                {phase === "show"
                  ? "MEMORIZE THE TRAIL"
                  : phase === "input"
                    ? "REBUILD THE TRAIL"
                    : "NEURAL MEMORY TEST"}
              </small>
              <strong>
                {phase === "show"
                  ? "Watch every pulse"
                  : phase === "input"
                    ? `${entered.length} / ${sequence.length} pulses locked`
                    : "Echo Grid"}
              </strong>
            </div>
          </div>
          <div className="echo-level-chip">
            <span>LEVEL</span>
            <strong>{String(level).padStart(2, "0")}</strong>
          </div>
          <button
            className="echo-sound-button"
            onClick={() => setMuted((value) => !value)}
            aria-label={muted ? "Turn sound on" : "Mute sound"}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </button>
        </div>

        <div className="echo-game-frame">
          <div className="echo-frame-corner corner-tl" />
          <div className="echo-frame-corner corner-tr" />
          <div className="echo-frame-corner corner-bl" />
          <div className="echo-frame-corner corner-br" />
          <div className="echo-board-wrap">
            <div
              className="echo-board echo-board-premium"
              style={{
                width: "min(78vw, 680px)",
                height: "min(78vw, 680px)",
                maxWidth: "calc(100vw - 32px)",
                maxHeight: "calc(100vh - 210px)",
              }}
            >
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
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="echo-bottom-hud">
          <div className="echo-integrity">
            <span>INTEGRITY</span>
            <div>
              {[0, 1, 2].map((i) => (
                <i key={i} className={i < strikes ? "lost" : ""} />
              ))}
            </div>
          </div>
          <div className="echo-rule">
            <Sparkles />
            <span>
              <b>One trail.</b> It grows until you break it.
            </span>
          </div>
          <div className="echo-best-chip">
            <small>BEST</small>
            <strong>{String(best).padStart(2, "0")}</strong>
          </div>
        </div>

        {(phase === "idle" || phase === "over") && (
          <div className="solo-overlay echo-overlay-premium">
            <div className="echo-overlay-orb"><Sparkles /></div>
            <small>
              {phase === "over" ? "NEURAL LINK SEVERED" : "MINDBOP MEMORY LAB"}
            </small>
            <h1>
              {phase === "over" ? `LEVEL ${level}` : "Echo the impossible."}
            </h1>
            <p>
              Watch the trail. Rebuild it in the exact same order. Every new
              game starts with a different trail — but once you begin, the trail
              stays locked and grows one pulse at a time.
            </p>
            <button onClick={start}>
              {phase === "over" ? <RotateCcw /> : <Play />}
              {phase === "over" ? "New neural run" : "Enter the grid"}
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
