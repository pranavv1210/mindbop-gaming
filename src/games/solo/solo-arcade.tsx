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
      <style>{`
        .echo-world-premium{--eg-bg:#080713;--eg-panel:#121026;--eg-panel-2:#19142f;--eg-text:#f8f5ff;--eg-muted:#aaa2c1;--eg-violet:#a56cff;--eg-pink:#ff4fb3;--eg-cyan:#48e9ff;--eg-green:#63f0bd;position:relative;isolation:isolate}
        .echo-world-premium .echo-stage-premium{position:relative;display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden;border:1px solid #7c4fd166;border-radius:28px;background:radial-gradient(circle at 50% 42%,#2b1450 0,#10091f 46%,#05040c 100%);box-shadow:0 35px 110px #000b, inset 0 1px 0 #ffffff20}
        .echo-world-premium .echo-stage-premium:before{content:"";position:absolute;inset:0;z-index:-2;background:radial-gradient(circle at 15% 25%,#ff4fb31c,transparent 27%),radial-gradient(circle at 85% 70%,#48e9ff18,transparent 30%),radial-gradient(circle at 50% 120%,#a56cff35,transparent 42%)}
        .echo-world-premium .echo-status-premium{display:grid;grid-template-columns:1fr auto auto;gap:16px;align-items:center;padding:18px 22px;border-bottom:1px solid #ffffff15;background:#09071499;backdrop-filter:blur(18px)}
        .echo-status-copy{display:flex;align-items:center;gap:12px;min-width:0}.echo-status-copy>div{display:grid;min-width:0}.echo-status-copy small{color:#988caf;font-size:9px;font-weight:900;letter-spacing:.14em}.echo-status-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--eg-text);font-size:14px}
        .echo-live-dot{width:9px;height:9px;flex:0 0 auto;border-radius:50%;background:var(--eg-green);box-shadow:0 0 0 5px #63f0bd16,0 0 16px #63f0bd;animation:egPulse 1.3s ease-in-out infinite}.echo-stage-premium.echo-mistake .echo-live-dot{background:var(--eg-pink);box-shadow:0 0 0 5px #ff4fb316,0 0 16px #ff4fb3}
        @keyframes egPulse{50%{opacity:.45;transform:scale(.72)}}
        .echo-level-chip{display:flex;align-items:baseline;gap:8px;padding:8px 13px;border:1px solid #ffffff1c;border-radius:13px;background:#ffffff08;box-shadow:inset 0 1px 0 #ffffff0d}.echo-level-chip span{color:#8e86a4;font-size:8px;font-weight:900;letter-spacing:.14em}.echo-level-chip strong{color:#d7bdff;font-size:21px;font-variant-numeric:tabular-nums}.echo-sound-button{display:grid;width:42px;height:42px;place-items:center;border:1px solid #ffffff1c;border-radius:12px;background:#ffffff08;color:#c9bce1;transition:.18s}.echo-sound-button:hover{border-color:#a56cff80;background:#a56cff16;color:white;transform:translateY(-1px)}.echo-sound-button svg{width:18px}
        .echo-aurora{position:absolute;z-index:-1;width:38%;aspect-ratio:1;border-radius:50%;filter:blur(50px);opacity:.22;pointer-events:none}.echo-aurora-one{left:-12%;top:25%;background:#ff4fb3}.echo-aurora-two{right:-12%;bottom:8%;background:#48e9ff}.echo-stars{position:absolute;inset:0;z-index:-1;opacity:.22;background-image:radial-gradient(circle,#fff 1px,transparent 1.5px),radial-gradient(circle,#a56cff 1px,transparent 1.5px);background-size:73px 91px,131px 117px;background-position:20px 18px,70px 40px}.echo-scanline{position:absolute;inset:0;z-index:5;pointer-events:none;opacity:.07;background:repeating-linear-gradient(180deg,transparent 0 4px,#fff 5px,transparent 6px);mix-blend-mode:screen}
        .echo-game-frame{position:relative;display:grid;place-items:center;min-height:0;margin:10px 18px;border:1px solid #ffffff13;border-radius:24px;background:#05040d38;box-shadow:inset 0 0 90px #0007,0 20px 50px #0005}.echo-game-frame:before{content:"";position:absolute;inset:9%;border:1px solid #a56cff12;border-radius:22px;box-shadow:0 0 80px #a56cff0c}
        .echo-frame-corner{position:absolute;width:18px;height:18px;border-color:#a56cff99;pointer-events:none}.corner-tl{top:12px;left:12px;border-top:2px solid;border-left:2px solid}.corner-tr{top:12px;right:12px;border-top:2px solid;border-right:2px solid}.corner-bl{bottom:12px;left:12px;border-bottom:2px solid;border-left:2px solid}.corner-br{bottom:12px;right:12px;border-bottom:2px solid;border-right:2px solid}
        .echo-board-wrap{position:relative;display:grid;place-items:center;filter:drop-shadow(0 30px 45px #0009)}.echo-board-premium{position:relative!important;display:grid!important;grid-template-columns:repeat(4,1fr);gap:clamp(7px,1vw,13px);padding:clamp(8px,1.2vw,14px);border:1px solid #ffffff20;border-radius:28px;background:linear-gradient(145deg,#2d214d,#100b20);box-shadow:inset 0 1px 0 #ffffff24,inset 0 -18px 35px #0007,0 0 0 7px #a56cff08,0 0 70px #a56cff1c;transform:perspective(1000px) rotateX(5deg)}
        .echo-board-premium:after{content:"";position:absolute;inset:5px;border-radius:23px;border:1px solid #ffffff08;pointer-events:none}
        .echo-board-premium button{position:relative;display:grid;place-items:center;min-width:0;border:1px solid color-mix(in srgb,var(--cell) 32%,#ffffff0);border-radius:clamp(10px,1.2vw,18px);background:radial-gradient(circle at 50% 35%,color-mix(in srgb,var(--cell) 17%,#ffffff0),#0f0a1b 68%);box-shadow:inset 0 2px 0 #ffffff0c,inset 0 -12px 18px #0006,0 5px 12px #0007;overflow:hidden;transition:transform .12s ease,filter .12s ease,border-color .12s ease,box-shadow .12s ease}.echo-board-premium button:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,var(--cell),transparent 68%);opacity:.06;transition:.12s}.echo-board-premium button>i{position:absolute;width:25%;aspect-ratio:1;border:1px solid color-mix(in srgb,var(--cell) 55%,white);border-radius:50%;opacity:.18;box-shadow:0 0 12px var(--cell)}.echo-board-premium button>span{position:absolute;right:8px;bottom:6px;color:#ffffff22;font-size:8px;font-weight:900}.echo-board-premium button:not(:disabled):hover{transform:translateY(-4px) scale(1.02);border-color:color-mix(in srgb,var(--cell) 72%,white);filter:brightness(1.3)}.echo-board-premium button.active{z-index:3;transform:scale(.94);border-color:#fff;background:radial-gradient(circle at 50% 45%,#fff 0 7%,var(--cell) 22%,color-mix(in srgb,var(--cell) 68%,#12091e) 72%);box-shadow:0 0 0 2px #fff,0 0 24px var(--cell),0 0 70px color-mix(in srgb,var(--cell) 70%,transparent),inset 0 0 25px #fff}.echo-board-premium button.active:before{opacity:.5;animation:egFlash .45s ease-out}.echo-board-premium button.active>i{opacity:1;background:#fff;border-color:#fff;box-shadow:0 0 22px #fff}.echo-board-premium button.active>span{color:#ffffffaa}@keyframes egFlash{from{transform:scale(.55);opacity:.9}to{transform:scale(1.5);opacity:0}}
        .echo-bottom-hud{position:relative;z-index:3;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:20px;padding:12px 24px 16px}.echo-integrity{display:flex;align-items:center;gap:9px}.echo-integrity>span,.echo-best-chip small{color:#756d89;font-size:8px;font-weight:900;letter-spacing:.13em}.echo-integrity>div{display:flex;gap:5px}.echo-integrity i{display:block;width:25px;height:5px;border-radius:99px;background:var(--eg-green);box-shadow:0 0 10px #63f0bd66}.echo-integrity i.lost{background:var(--eg-pink);box-shadow:0 0 10px #ff4fb366}.echo-rule{display:flex;align-items:center;gap:8px;color:#9b91af;font-size:10px}.echo-rule svg{width:14px;color:#a56cff}.echo-rule b{color:#d3c8e2}.echo-best-chip{display:flex;justify-self:end;align-items:baseline;gap:7px}.echo-best-chip strong{color:#e1c9ff;font-size:18px;font-variant-numeric:tabular-nums}
        .echo-overlay-premium{background:radial-gradient(circle at 50% 38%,#2a1450d9,#05040ddd 68%);backdrop-filter:blur(12px)}.echo-overlay-orb{display:grid;width:92px;height:92px;place-items:center;border:1px solid #d19cff66;border-radius:50%;background:radial-gradient(circle,#b46aff55,#7e45c411 60%,transparent 70%);box-shadow:0 0 70px #a56cff55}.echo-overlay-orb svg{width:34px;margin:0;color:#e4c6ff;filter:drop-shadow(0 0 12px #b56cff)}.echo-overlay-premium h1{font-size:clamp(46px,7vw,86px);background:linear-gradient(110deg,#fff,#d7bcff 45%,#ff8fd0);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none}.echo-overlay-premium p{max-width:650px;color:#aaa2bd}.echo-overlay-premium button{min-height:52px;padding:13px 23px;border-radius:15px;background:linear-gradient(135deg,#a56cff,#ff4fb3);box-shadow:0 12px 35px #a56cff42,0 0 0 1px #ffffff33 inset;color:white}.echo-overlay-premium button:hover{transform:translateY(-2px);filter:brightness(1.08)}.echo-stage-premium.echo-mistake{animation:egShake .22s ease-out}.echo-stage-premium.echo-mistake .echo-game-frame{box-shadow:inset 0 0 90px #ff174430,0 20px 50px #0005}@keyframes egShake{25%{transform:translateX(-5px)}50%{transform:translateX(5px)}75%{transform:translateX(-3px)}}
        @media(max-width:760px){.echo-world-premium .echo-stage-premium{border-radius:18px}.echo-world-premium .echo-status-premium{grid-template-columns:1fr auto;padding:12px}.echo-sound-button{width:38px;height:38px}.echo-level-chip{display:none}.echo-game-frame{margin:7px 8px;border-radius:18px}.echo-board-premium{gap:6px;padding:8px;border-radius:20px;transform:perspective(800px) rotateX(3deg)}.echo-board-premium button{border-radius:10px}.echo-board-premium button>span{right:5px;bottom:4px;font-size:7px}.echo-bottom-hud{grid-template-columns:1fr auto;padding:9px 12px 12px}.echo-rule{display:none}.echo-best-chip{justify-self:end}.echo-overlay-premium{padding:22px}.echo-overlay-orb{width:70px;height:70px}.echo-overlay-premium p{font-size:12px}.echo-overlay-premium h1{font-size:42px}}
        @media(max-height:700px) and (min-width:761px){.echo-status-premium{padding-block:10px!important}.echo-game-frame{margin-block:5px}.echo-board-premium{max-height:calc(100% - 8px)}.echo-bottom-hud{padding-block:7px 10px}}
        @media(prefers-reduced-motion:reduce){.echo-live-dot,.echo-board-premium button.active:before,.echo-stage-premium.echo-mistake{animation:none}.echo-stage-premium.echo-mistake{transform:none}}
      `}</style>

      <Header title="Echo Grid" score={level} best={best} />
      <section className={`echo-stage echo-stage-premium ${mistake ? "echo-mistake" : ""}`}>
        <div className="echo-aurora echo-aurora-one" aria-hidden="true" />
        <div className="echo-aurora echo-aurora-two" aria-hidden="true" />
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
                width: "min(55dvh, 590px, calc(100vw - 28px))",
                height: "auto",
                maxWidth: "calc(100% - 16px)",
                maxHeight: "calc(100% - 16px)",
                aspectRatio: "1",
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
