"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
} from "react";
import {
  Brush,
  Eraser,
  PaintBucket,
  Palette,
  RotateCcw,
  Send,
  Share2,
  Trophy,
  Users,
} from "lucide-react";
import { useGame } from "@/components/game-provider";
import { Avatar } from "@/components/art";
import { ThemeToggle } from "@/components/theme-toggle";
import type { RoomView } from "@/lib/protocol";
import type { DrawAction, DrawPoint, DrawView } from "./types";

const COLORS = [
  "#202033",
  "#ffffff",
  "#76717f",
  "#7659ff",
  "#4b2bd6",
  "#ff5f57",
  "#e83054",
  "#ff9f1c",
  "#ffd43b",
  "#79d642",
  "#24b89f",
  "#12a594",
  "#2397ff",
  "#176bd6",
  "#b95cff",
  "#f45bc4",
];
const SIZES = [3, 7, 13, 22, 36, 54];
type Tool = "brush" | "bucket" | "eraser";

export function DrawGame({
  room,
  leave,
  rematch,
}: {
  room: RoomView<DrawView>;
  leave: () => void;
  rematch: () => void;
}) {
  const { id, send, draw, onDrawPoints } = useGame();
  const game = room.game!;
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const strokeId = useRef("");
  const points = useRef<DrawPoint[]>(game.strokes);
  const queue = useRef<DrawPoint[]>([]);
  const frame = useRef<number | undefined>(undefined);
  const lastPoint = useRef<DrawPoint | undefined>(undefined);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(7);
  const [tool, setTool] = useState<Tool>("brush");
  const [guess, setGuess] = useState("");
  const [now, setNow] = useState(room.serverTime);
  const [error, setError] = useState("");
  const drawer = game.drawerId === id;
  const seconds = Math.max(0, Math.ceil((game.deadline - now) / 1000));
  const names = useMemo(
    () => Object.fromEntries(room.players.map((p) => [p.id, p.name])),
    [room.players],
  );

  const paint = useCallback((batch: DrawPoint[], reset = false) => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const w = el.width,
      h = el.height;
    if (reset) {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fffdf8";
      ctx.fillRect(0, 0, w, h);
      lastPoint.current = undefined;
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const p of batch) {
      if (p.fill) {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.fillStyle = p.color;
        ctx.fillRect(0, 0, w, h);
        lastPoint.current = undefined;
        continue;
      }
      const previous = lastPoint.current;
      ctx.globalCompositeOperation = p.erase
        ? "destination-out"
        : "source-over";
      ctx.globalAlpha = p.opacity ?? 1;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * Math.min(devicePixelRatio || 1, 2);
      ctx.beginPath();
      if (p.start || !previous || previous.id !== p.id) {
        ctx.moveTo(p.x * w, p.y * h);
        ctx.lineTo(p.x * w + 0.01, p.y * h + 0.01);
      } else {
        ctx.moveTo(previous.x * w, previous.y * h);
        ctx.lineTo(p.x * w, p.y * h);
      }
      ctx.stroke();
      lastPoint.current = p;
    }
    ctx.globalAlpha = 1;
  }, []);
  const resize = useCallback(() => {
    const el = canvas.current;
    if (!el) return;
    const rect = el.getBoundingClientRect(),
      ratio = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * ratio)),
      h = Math.max(1, Math.round(rect.height * ratio));
    if (el.width !== w || el.height !== h) {
      el.width = w;
      el.height = h;
      paint(points.current, true);
    }
  }, [paint]);
  useEffect(() => {
    const timer = setInterval(() => setNow((value) => value + 250), 250);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    return () => observer.disconnect();
  }, [resize]);
  useEffect(() => {
    points.current = game.strokes;
    paint(points.current, true);
  }, [game.canvasVersion, game.runId, game.strokes, paint]);
  useEffect(
    () =>
      onDrawPoints((incoming) => {
        points.current.push(...incoming);
        paint(incoming);
      }),
    [onDrawPoints, paint],
  );
  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  function flush() {
    frame.current = undefined;
    if (!queue.current.length) return;
    draw(queue.current.splice(0, 32));
    if (queue.current.length) frame.current = requestAnimationFrame(flush);
  }
  function addPoint(e: PointerEvent<HTMLCanvasElement>, start: boolean) {
    const rect = e.currentTarget.getBoundingClientRect();
    const source = e.nativeEvent.getCoalescedEvents?.().at(-1) ?? e.nativeEvent;
    const point: DrawPoint = {
      id: strokeId.current,
      x: Math.max(0, Math.min(1, (source.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (source.clientY - rect.top) / rect.height)),
      color,
      size,
      erase: tool === "eraser",
      start,
      opacity: 1,
    };
    points.current.push(point);
    paint([point]);
    queue.current.push(point);
    if (!frame.current) frame.current = requestAnimationFrame(flush);
  }
  function down(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawer || game.phase !== "drawing") return;
    e.preventDefault();
    if (tool === "bucket") {
      void action({ type: "fill-canvas", color });
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    strokeId.current = crypto.randomUUID();
    addPoint(e, true);
  }
  function move(e: PointerEvent<HTMLCanvasElement>) {
    if (drawing.current) addPoint(e, false);
  }
  function stop() {
    drawing.current = false;
    flush();
  }
  async function action(action: DrawAction) {
    const result = await send({ type: "game", action });
    if (!result.ok) setError(result.error);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!guess.trim()) return;
    await action({ type: "guess", text: guess });
    setGuess("");
  }

  if (game.finished || game.phase === "finished") {
    const ranking = [...room.players].sort(
      (a, b) => game.scores[b.id] - game.scores[a.id],
    );
    return (
      <section className="draw-results">
        <Trophy />
        <p>That was beautifully chaotic.</p>
        <h1>{game.winnerIds.map((x) => names[x]).join(" & ")} wins!</h1>
        <div className="result-list">
          {ranking.map((p, i) => (
            <div key={p.id}>
              <span>{i + 1}</span>
              <strong>{p.name}</strong>
              <b>{game.scores[p.id]} pts</b>
            </div>
          ))}
        </div>
        <div className="room-actions">
          <button className="button button-primary" onClick={rematch}>
            Play again
          </button>
          <button className="button button-outline" onClick={leave}>
            Back to hub
          </button>
        </div>
      </section>
    );
  }
  return (
    <section className={`draw-game ${drawer ? "is-drawer" : "is-guesser"}`}>
      <header className="draw-bar">
        <div>
          <small>
            Round {game.round} of {game.totalRounds}
          </small>
          <strong>
            {drawer ? "Your turn to draw" : game.hint || "Get ready…"}
          </strong>
        </div>
        <div className={`draw-timer ${seconds <= 10 ? "urgent" : ""}`}>
          {seconds}
          <small>sec</small>
        </div>
        <div>
          <small>Artist</small>
          <strong>
            {names[game.drawerId]}
            {drawer ? " (you)" : ""}
          </strong>
        </div>
      </header>
      <div className="draw-layout">
        <aside className="draw-players" aria-label="Scoreboard">
          <h2>
            <Users size={18} /> Players
          </h2>
          {[...room.players]
            .sort((a, b) => game.scores[b.id] - game.scores[a.id])
            .map((p) => (
              <div
                className={`${p.id === game.drawerId ? "artist" : ""} ${game.guessed.includes(p.id) ? "guessed" : ""}`}
                key={p.id}
              >
                <span><Avatar index={p.avatar} /></span>
                <p>
                  <strong>{p.name}</strong>
                  <small>
                    {p.id === game.drawerId
                      ? "drawing"
                      : game.guessed.includes(p.id)
                        ? "got it!"
                        : "guessing"}
                  </small>
                </p>
                <b>{game.scores[p.id]}</b>
              </div>
            ))}
        </aside>
        <main className="canvas-zone">
          <div className="canvas-wrap">
            {drawer && game.phase === "drawing" && (
              <div className="secret-word">
                <small>Your word</small>
                <strong>{game.word}</strong>
              </div>
            )}
            <canvas
              ref={canvas}
              aria-label="Shared drawing canvas"
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={stop}
              onPointerCancel={stop}
            />
            {game.phase === "choosing" && (
              <div className="word-picker">
                {drawer ? (
                  <>
                    <p>Choose your secret word</p>
                    <div>
                      {game.choices?.map((word, index) => (
                        <button
                          key={word}
                          onClick={() =>
                            void action({ type: "choose-word", index })
                          }
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                    <small>
                      One will be picked automatically in {seconds}s
                    </small>
                  </>
                ) : (
                  <>
                    <span className="picker-pencil">✏️</span>
                    <h2>{names[game.drawerId]} is choosing</h2>
                    <p>The canvas wakes up in {seconds}s.</p>
                  </>
                )}
              </div>
            )}
            {game.phase === "round-end" && (
              <div className="word-picker">
                <span className="picker-pencil">✨</span>
                <p>The word was</p>
                <h2>{game.lastWord}</h2>
                <small>Next artist in {seconds}s</small>
              </div>
            )}
          </div>
          {drawer && <div className="draw-tools" aria-label="Drawing tools">
            <div className="tool-modes">
              <button
                className={tool === "brush" ? "active" : ""}
                aria-label="Brush"
                onClick={() => setTool("brush")}
              >
                <Brush />
              </button>
              <button
                className={tool === "bucket" ? "active" : ""}
                aria-label="Paint bucket"
                onClick={() => setTool("bucket")}
              >
                <PaintBucket />
              </button>
              <button
                className={tool === "eraser" ? "active" : ""}
                aria-label="Eraser"
                onClick={() => setTool("eraser")}
              >
                <Eraser />
              </button>
            </div>
            <div className="colors">
              {COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={`Use ${c}`}
                  className={color === c && tool !== "eraser" ? "selected" : ""}
                  style={{ background: c }}
                  onClick={() => {
                    setColor(c);
                    if (tool === "eraser") setTool("brush");
                  }}
                />
              ))}
              <label className="custom-color" aria-label="Custom color">
                <Palette />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    setTool("brush");
                  }}
                />
              </label>
            </div>
            <div className="size-presets" aria-label="Brush sizes">
              {SIZES.map((value) => (
                <button
                  key={value}
                  className={size === value ? "active" : ""}
                  aria-label={`${value} pixel brush`}
                  onClick={() => setSize(value)}
                >
                  <i
                    style={{
                      width: Math.min(22, value / 2 + 3),
                      height: Math.min(22, value / 2 + 3),
                    }}
                  />
                </button>
              ))}
            </div>
            <label className="size-slider">
              Size {size}
              <input
                aria-label="Brush size"
                type="range"
                min="1"
                max="64"
                value={size}
                onChange={(e) => setSize(+e.target.value)}
              />
            </label>
            <button
              aria-label="Undo last stroke"
              title="Undo last stroke"
              onClick={() => { stop(); void action({ type: "undo-stroke" }); }}
            >
              <RotateCcw />
            </button>
          </div>}
        </main>
        {!drawer && <aside className="draw-chat">
          <h2>Guesses</h2>
          <div
            className="chat-log"
            aria-label="Guess history"
            aria-live="polite"
            tabIndex={0}
          >
            {game.messages.map((m) => (
              <p className={m.kind} key={m.id}>
                {m.playerId && <strong>{names[m.playerId]} </strong>}
                {m.text}
              </p>
            ))}
          </div>
          <form onSubmit={submit}>
            {game.guessFeedback && (
              <span className="guess-feedback" role="status">
                {game.guessFeedback}
              </span>
            )}
            <input
              aria-label="Guess the word"
              maxLength={80}
              disabled={
                drawer || game.phase !== "drawing" || game.guessed.includes(id)
              }
              placeholder={
                drawer
                  ? "You’re drawing!"
                  : game.guessed.includes(id)
                    ? "You got it!"
                    : "Type your guess…"
              }
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
            />
            <button aria-label="Send guess">
              <Send />
            </button>
          </form>
        </aside>}
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <footer className="draw-footer">
        <span>Room {room.code}</span>
        <ThemeToggle />
        <button
          onClick={() =>
            navigator
              .share?.({ title: "MindBop Draw", url: location.href })
              .catch(() => {})
          }
        >
          <Share2 /> Share room
        </button>
        <button onClick={leave}>Leave game</button>
      </footer>
    </section>
  );
}
