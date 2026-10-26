"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Crosshair, Heart, Play, ShieldAlert, Zap } from "lucide-react";
import { GameFullscreen } from "@/components/game-fullscreen";

const BEST_KEY = "mindbop_neon_best";

type Difficulty = "easy" | "medium" | "hard";

const LEVELS: Record<
  Difficulty,
  { label: string; color: string; minHits: number; size: number; lifetime: number; multiplier: number }
> = {
  easy: { label: "EASY", color: "#54e58b", minHits: 0, size: 102, lifetime: 3000, multiplier: 1 },
  medium: { label: "MEDIUM", color: "#ffd45a", minHits: 8, size: 86, lifetime: 2200, multiplier: 1.2 },
  hard: { label: "HARD", color: "#ff5f88", minHits: 20, size: 70, lifetime: 1550, multiplier: 1.45 },
};

function getDifficulty(hits: number): Difficulty {
  if (hits < 8) return "easy";
  if (hits < 20) return "medium";
  return "hard";
}

function useBestScore() {
  const [best, setBest] = useState(0);

  useEffect(() => {
    // Browser-only persistence; Neon Breach stays account-free.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBest(Number(window.localStorage.getItem(BEST_KEY) ?? 0));
  }, []);

  const save = useCallback((score: number) => {
    setBest((current) => {
      const next = Math.max(current, score);
      window.localStorage.setItem(BEST_KEY, String(next));
      return next;
    });
  }, []);

  return [best, save] as const;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function NeonBreach() {
  const [phase, setPhase] = useState<"idle" | "running" | "over">("idle");
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [time, setTime] = useState(45);
  const [target, setTarget] = useState({ x: 50, y: 50, key: 0 });
  const [expired, setExpired] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [best, saveBest] = useBestScore();
  const born = useRef(0);
  const targetKey = useRef(0);
  const finishLock = useRef(false);

  const difficulty = getDifficulty(hits);
  const config = LEVELS[difficulty];
  const progress = useMemo(() => {
    if (difficulty === "easy") return hits / 8;
    if (difficulty === "medium") return (hits - 8) / 12;
    return Math.min(1, (hits - 20) / 15);
  }, [difficulty, hits]);

  const spawn = useCallback(() => {
    targetKey.current += 1;
    born.current = performance.now();
    setExpired(false);
    setFeedback("");
    setTarget({
      x: randomBetween(12, 88),
      y: randomBetween(18, 82),
      key: targetKey.current,
    });
  }, []);

  const finish = useCallback(
    (finalScore: number) => {
      if (finishLock.current) return;
      finishLock.current = true;
      saveBest(finalScore);
      setPhase("over");
    },
    [saveBest],
  );

  useEffect(() => {
    if (phase !== "running") return;

    const timer = window.setInterval(() => {
      setTime((value) => {
        const next = Math.max(0, value - 0.1);
        if (next <= 0) finish(score);
        return next;
      });

      const elapsed = performance.now() - born.current;
      if (elapsed >= config.lifetime && !expired) {
        setExpired(true);
        setCombo(0);
        setFeedback("TOO SLOW");
        setLives((value) => {
          const next = value - 1;
          if (next <= 0) {
            finish(score);
            return 0;
          }
          window.setTimeout(spawn, 300);
          return next;
        });
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [config.lifetime, expired, finish, phase, score, spawn]);

  function start() {
    finishLock.current = false;
    setScore(0);
    setHits(0);
    setCombo(0);
    setLives(3);
    setTime(45);
    setFeedback("");
    setPhase("running");
    spawn();
  }

  function hit() {
    if (phase !== "running" || expired || finishLock.current) return;

    const reaction = performance.now() - born.current;
    const speedRatio = Math.max(0, 1 - reaction / config.lifetime);
    const nextCombo = combo + 1;
    const points = Math.round(
      (90 + speedRatio * 110 + Math.min(180, nextCombo * 12)) * config.multiplier,
    );
    const nextScore = score + points;

    setScore(nextScore);
    saveBest(nextScore);
    setHits((value) => value + 1);
    setCombo(nextCombo);
    setFeedback(`+${points}`);
    spawn();
  }

  const nextMilestone = difficulty === "easy" ? 8 : difficulty === "medium" ? 20 : null;

  return (
    <main className="neon-breach-game" id="neon-breach-game">
      <GameFullscreen targetId="neon-breach-game" />
      <style>{`
        .neon-breach-game{--nb-bg:#05070f;--nb-text:#f4f7ff;--nb-muted:#8e9ab7;min-height:100dvh;display:flex;flex-direction:column;color:var(--nb-text);background:radial-gradient(circle at 50% 35%,#17254a 0,#090d1b 34%,#03050b 78%);font-family:"DM Sans",system-ui,sans-serif;overflow:hidden}.neon-breach-game *{box-sizing:border-box}
        .nb-header{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:18px;min-height:76px;padding:0 clamp(16px,4vw,44px);border-bottom:1px solid #ffffff14;background:#060914bb;backdrop-filter:blur(18px);z-index:10}.nb-header a{display:inline-flex;align-items:center;gap:8px;width:max-content;color:#9ca8c4;text-decoration:none;font-size:12px;font-weight:800}.nb-header a:hover{color:#fff}.nb-header a svg{width:15px}.nb-title{display:grid;text-align:center}.nb-title small,.nb-stat small{color:#75819d;font-size:8px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.nb-title strong{font-size:16px;letter-spacing:-.02em}.nb-stat{text-align:right}.nb-stat strong{display:block;font-size:18px;font-variant-numeric:tabular-nums}
        .nb-stage{position:relative;isolation:isolate;flex:1;min-height:560px;margin:18px clamp(10px,2.5vw,28px) 24px;border:1px solid #ffffff18;border-radius:28px;overflow:hidden;background:radial-gradient(circle at 50% 45%,#142244 0,#090f1e 38%,#03050c 100%);box-shadow:0 30px 90px #0008,inset 0 1px 0 #ffffff14}.nb-stage:before{content:"";position:absolute;inset:0;z-index:-2;background:radial-gradient(circle at 15% 25%,#24ecff18,transparent 25%),radial-gradient(circle at 84% 20%,#785cff20,transparent 27%),radial-gradient(circle at 72% 84%,#ff4fa315,transparent 28%)}.nb-stage:after{content:"";position:absolute;inset:0;z-index:-1;opacity:.13;background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:72px 72px;mask-image:radial-gradient(circle at center,black,transparent 78%);pointer-events:none}
        .nb-topbar{position:absolute;left:20px;right:20px;top:18px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px;z-index:5}.nb-level{display:flex;align-items:center;gap:10px}.nb-level-badge{display:inline-flex;align-items:center;gap:7px;padding:8px 11px;border:1px solid color-mix(in srgb,var(--level-color) 40%,#ffffff14);border-radius:999px;background:#060914a8;box-shadow:0 8px 25px #0005}.nb-level-badge i{width:7px;height:7px;border-radius:50%;background:var(--level-color);box-shadow:0 0 14px var(--level-color)}.nb-level-badge strong{color:var(--level-color);font-size:9px;letter-spacing:.12em}.nb-progress{width:min(220px,24vw);height:4px;overflow:hidden;border-radius:99px;background:#ffffff10}.nb-progress i{display:block;height:100%;width:var(--progress);border-radius:inherit;background:var(--level-color);box-shadow:0 0 12px var(--level-color);transition:width .3s ease}.nb-time{justify-self:center;display:flex;align-items:center;gap:8px;padding:8px 13px;border:1px solid #ffffff14;border-radius:999px;background:#060914aa;color:#dce3f5;font-size:11px;font-weight:900;font-variant-numeric:tabular-nums}.nb-time svg{width:14px;color:#48e9ff}.nb-combo{justify-self:end;display:grid;text-align:right}.nb-combo small{color:#71809e;font-size:8px;font-weight:900;letter-spacing:.12em}.nb-combo strong{font-size:17px;color:#d8c6ff}.nb-lives{position:absolute;left:20px;bottom:20px;display:flex;gap:7px;z-index:5;padding:9px 11px;border:1px solid #ffffff12;border-radius:12px;background:#060914aa;backdrop-filter:blur(12px)}.nb-lives svg{width:16px;color:#ff5f88;fill:#ff5f8820}.nb-lives svg.dead{color:#44506a;fill:none}
        .nb-target{position:absolute;z-index:4;display:grid;place-items:center;padding:0;border:1px solid #ffffffcc;border-radius:50%;background:radial-gradient(circle at 50% 50%,#fff 0 4%,var(--target-color) 7% 23%,#09101f 25% 60%,color-mix(in srgb,var(--target-color) 38%,#06101c) 61% 100%);box-shadow:0 0 0 5px #ffffff0c,0 0 25px var(--target-color),0 0 70px color-mix(in srgb,var(--target-color) 55%,transparent),inset 0 0 28px #ffffff44;transform:translate(-50%,-50%);cursor:crosshair;transition:filter .12s ease,transform .12s ease;width:var(--target-size);height:var(--target-size);touch-action:manipulation;animation:nbAppear .24s ease-out}.nb-target:before,.nb-target:after{content:"";position:absolute;border:1px solid var(--target-color);border-radius:50%;inset:13%;opacity:.5}.nb-target:after{inset:29%;border-style:dashed;opacity:.75}.nb-target span{width:10px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 15px #fff,0 0 30px var(--target-color)}.nb-target:hover{filter:brightness(1.2);transform:translate(-50%,-50%) scale(1.06)}.nb-target:active{transform:translate(-50%,-50%) scale(.94)}.nb-target:focus-visible{outline:3px solid #fff;outline-offset:5px}@keyframes nbAppear{from{opacity:0;transform:translate(-50%,-50%) scale(.78)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        .nb-center-copy{position:absolute;left:50%;top:50%;z-index:2;transform:translate(-50%,-50%);width:min(430px,70vw);text-align:center;pointer-events:none;opacity:.52}.nb-center-copy small{display:block;color:#73809c;font-size:9px;font-weight:900;letter-spacing:.2em}.nb-center-copy strong{display:block;margin-top:8px;font-size:clamp(28px,4vw,52px);letter-spacing:-.045em;color:#dbe5ff}.nb-center-copy p{margin:8px 0 0;color:#71809c;font-size:12px}.nb-feedback{position:absolute;left:50%;top:62%;z-index:7;transform:translate(-50%,-50%);color:#fff;font-size:18px;font-weight:1000;letter-spacing:.04em;text-shadow:0 0 24px var(--level-color);pointer-events:none;animation:nbFeedback .45s ease-out forwards}@keyframes nbFeedback{from{opacity:0;transform:translate(-50%,-35%) scale(.8)}25%{opacity:1}to{opacity:0;transform:translate(-50%,-100%) scale(1.08)}}
        .nb-overlay{position:absolute;inset:0;z-index:20;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 40%,#111b35dd,#03050bef 72%);backdrop-filter:blur(12px)}.nb-panel{width:min(620px,calc(100% - 24px));padding:clamp(28px,5vw,54px);border:1px solid #ffffff1c;border-radius:28px;background:linear-gradient(145deg,#121a30e8,#080b15e8);box-shadow:0 35px 90px #000b,inset 0 1px 0 #ffffff14;text-align:center}.nb-orb{display:grid;width:76px;height:76px;margin:0 auto 18px;place-items:center;border:1px solid #48e9ff66;border-radius:50%;background:radial-gradient(circle,#48e9ff2c,transparent 68%);box-shadow:0 0 55px #48e9ff30}.nb-orb svg{width:30px;color:#8cf2ff;filter:drop-shadow(0 0 12px #48e9ff)}.nb-panel small{color:#48e9ff;font-size:9px;font-weight:900;letter-spacing:.2em}.nb-panel h1{margin:10px 0 12px;font-size:clamp(38px,7vw,72px);line-height:.98;letter-spacing:-.055em;background:linear-gradient(110deg,#fff,#9ceeff 46%,#a77cff);-webkit-background-clip:text;background-clip:text;color:transparent}.nb-panel p{max-width:500px;margin:0 auto 22px;color:#929eb9;font-size:13px;line-height:1.7}.nb-panel button{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:50px;padding:12px 22px;border:1px solid #ffffff22;border-radius:14px;background:linear-gradient(135deg,#48e9ff,#785cff);color:#fff;font-weight:900;box-shadow:0 15px 40px #48e9ff22;cursor:pointer;transition:transform .18s ease,filter .18s ease}.nb-panel button:hover{transform:translateY(-2px);filter:brightness(1.08)}.nb-panel button svg{width:17px}.nb-hint{position:absolute;right:20px;bottom:20px;z-index:5;color:#64708a;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.nb-hint b{color:#a9b5cd}
        @media(max-width:760px){.nb-header{grid-template-columns:1fr auto;min-height:68px}.nb-title{display:none}.nb-stat{text-align:right}.nb-stage{min-height:calc(100dvh - 112px);margin:10px;border-radius:20px}.nb-topbar{left:12px;right:12px;top:12px;grid-template-columns:1fr auto;gap:9px}.nb-progress{width:34vw}.nb-time{grid-column:1/-1;grid-row:2;justify-self:center}.nb-combo{grid-column:2;grid-row:1}.nb-level{grid-column:1;grid-row:1}.nb-lives{left:12px;bottom:12px}.nb-hint{right:12px;bottom:14px;font-size:8px}.nb-center-copy{width:82vw}.nb-target{touch-action:manipulation}}
        @media(max-width:420px){.nb-stage{min-height:calc(100dvh - 104px);margin:8px}.nb-topbar{top:10px}.nb-level-badge{padding:7px 9px}.nb-level-badge strong{font-size:8px}.nb-progress{width:26vw}.nb-time{font-size:10px}.nb-panel{padding:30px 20px}.nb-panel h1{font-size:42px}}
        @media(prefers-reduced-motion:reduce){.nb-target,.nb-feedback{animation:none}.nb-progress i,.nb-panel button,.nb-target{transition:none}}
      `}</style>

      <header className="nb-header">
        <Link href="/play"><ArrowLeft /> Game hub</Link>
        <div className="nb-title"><small>MindBop Solo</small><strong>Neon Breach</strong></div>
        <div className="nb-stat"><small>Personal best</small><strong>{best.toLocaleString()}</strong></div>
      </header>

      <section className="nb-stage" style={{ "--level-color": config.color, "--progress": `${Math.min(100, progress * 100)}%` } as React.CSSProperties}>
        <div className="nb-topbar">
          <div className="nb-level">
            <span className="nb-level-badge"><i /><strong>{config.label}</strong></span>
            <div className="nb-progress"><i /></div>
          </div>
          <div className="nb-time"><Zap /> {time.toFixed(1)}s</div>
          <div className="nb-combo"><small>COMBO</small><strong>{combo}×</strong></div>
        </div>

        <div className="nb-center-copy">
          <small>{difficulty === "easy" ? "WARMING UP" : difficulty === "medium" ? "KEEP GOING" : "MAXIMUM REACTION"}</small>
          <strong>{score.toLocaleString()}</strong>
          <p>{nextMilestone ? `${nextMilestone - hits} clean hit${nextMilestone - hits === 1 ? "" : "s"} until ${difficulty === "easy" ? "medium" : "hard"}.` : "Every clean hit now pushes your reaction limit."}</p>
        </div>

        {phase === "running" && (
          <button
            key={target.key}
            className="nb-target"
            style={{ left: `${target.x}%`, top: `${target.y}%`, "--target-color": config.color } as React.CSSProperties}
            aria-label="Hit signal"
            onPointerDown={hit}
          ><span /></button>
        )}

        {feedback && <div key={`${feedback}-${score}`} className="nb-feedback">{feedback}</div>}

        <div className="nb-lives" aria-label={`${lives} lives remaining`}>
          {[0, 1, 2].map((index) => <Heart key={index} className={index < lives ? "" : "dead"} />)}
        </div>
        <div className="nb-hint">Click the signal <b>as soon as you see it</b></div>

        {phase !== "running" && (
          <div className="nb-overlay">
            <div className="nb-panel">
              <div className="nb-orb"><Crosshair /></div>
              <small>{phase === "over" ? "RUN COMPLETE" : "REACTION TRAINING"}</small>
              <h1>{phase === "over" ? `${score.toLocaleString()} pts` : "Breach the grid."}</h1>
              <p>{phase === "over" ? `You reached ${hits} clean hits. Your best score is ${best.toLocaleString()}. Start again and push further.` : "Start comfortably. The targets are generous at first, then gradually shrink and speed up as your clean-hit streak grows."}</p>
              <button onClick={start}><Play /> {phase === "over" ? "Run it again" : "Initiate breach"}</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
