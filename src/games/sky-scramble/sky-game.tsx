"use client";
import { RotateGate } from "@/components/rotate-gate";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Trophy,
} from "lucide-react";
import { useGame } from "@/components/game-provider";
import { MobileLandscapeGate } from "@/components/mobile-landscape-gate";
import type { RoomView } from "@/lib/protocol";
import type { SkyAction, SkyView } from "./types";
import { SkyViewport } from "./sky-viewport";
const EMOTES = ["👋", "😂", "🎉", "😎", "😱"] as const;
export function SkyScrambleGame({
  room,
  leave,
  rematch,
}: {
  room: RoomView<SkyView>;
  leave: () => void;
  rematch: () => void;
}) {
  const { id, move, send } = useGame();
  const game = room.game!;
  const keys = useRef(new Set<string>());
  const touch = useRef({ x: 0, z: 0 });
  const [now, setNow] = useState(room.serverTime);
  const names = useMemo(
    () => Object.fromEntries(room.players.map((p) => [p.id, p.name])),
    [room.players],
  );
  useEffect(() => {
    const t = setInterval(() => setNow((v) => v + 250), 250);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "Space",
        ].includes(e.code)
      ) {
        e.preventDefault();
        keys.current.add(e.code);
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    const t = setInterval(() => {
      const set = keys.current;
      const x =
        (set.has("KeyD") || set.has("ArrowRight") ? 1 : 0) -
        (set.has("KeyA") || set.has("ArrowLeft") ? 1 : 0) +
        touch.current.x;
      const z =
        (set.has("KeyW") || set.has("ArrowUp") ? 1 : 0) -
        (set.has("KeyS") || set.has("ArrowDown") ? 1 : 0) +
        touch.current.z;
      move(
        Math.max(-1, Math.min(1, x)),
        Math.max(-1, Math.min(1, z)),
        set.has("Space"),
      );
      set.delete("Space");
    }, 50);
    return () => {
      clearInterval(t);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      move(0, 0);
    };
  }, [move]);
  const seconds = Math.max(0, Math.ceil((game.deadline - now) / 1000));
  const player = game.players[id];
  const position =
    game.activeIds
      .filter((x) => !game.players[x].qualified)
      .sort((a, b) => game.players[b].z - game.players[a].z)
      .indexOf(id) + 1;
  async function emote(emoji: (typeof EMOTES)[number]) {
    await send({
      type: "game",
      action: { type: "sky-emote", emoji } as SkyAction,
    });
  }
  function touchStart(e: React.PointerEvent, x: number, z: number) {
    e.preventDefault();
    touch.current = { x, z };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  const release = () => {
    touch.current = { x: 0, z: 0 };
  };
  if (game.finished) {
    return (
      <section className="sky-game sky-finale">
        <Trophy />
        <small>Sky Scramble champion</small>
        <h1>{game.winnerIds.map((x) => names[x]).join(" & ")}</h1>
        <p>Run. Jump. Fall. Somehow survive.</p>
        <div className="room-actions">
          <button className="button button-primary" onClick={rematch}>
            Play again
          </button>
          <button className="button button-outline" onClick={leave}>
            Back to games
          </button>
        </div>
      </section>
    );
  }
  return (
    <RotateGate game="Sky Scramble">
    <section className="sky-game">
      <SkyViewport game={game} id={id} />
      <MobileLandscapeGate game="Sky Scramble" />
      <header className="sky-hud">
        <div>
          <small>Round</small>
          <strong>
            {game.round}/{game.totalRounds}
          </strong>
        </div>
        <div>
          <small>Qualified</small>
          <strong>
            {game.qualifiedIds.length}/{game.qualifyTarget}
          </strong>
        </div>
        <div>
          <small>Time</small>
          <strong>{seconds}s</strong>
        </div>
        <div>
          <small>Position</small>
          <strong>
            {player?.qualified
              ? "Qualified"
              : position > 0
                ? `${position}/${game.activeIds.length}`
                : "Spectating"}
          </strong>
        </div>
      </header>
      {game.phase === "countdown" && (
        <div className="sky-countdown">
          {seconds <= 1 ? "GO!" : Math.max(1, seconds - 1)}
        </div>
      )}
      {game.phase === "round-results" && (
        <div className="sky-results">
          <small>Round complete</small>
          <h1>{player?.qualified ? "Qualified!" : "Spectator mode"}</h1>
          <div>
            {game.qualifiedIds.map((x, i) => (
              <p key={x}>
                <span>{i + 1}</span>
                {names[x]}
              </p>
            ))}
          </div>
        </div>
      )}
      {player?.emote && <div className="sky-player-emote">{player.emote}</div>}
      <div className="sky-emotes">
        {EMOTES.map((x) => (
          <button key={x} onClick={() => void emote(x)}>
            {x}
          </button>
        ))}
      </div>
      <div className="sky-mobile-controls">
        <div className="sky-dpad">
          <button
            aria-label="Move forward"
            onPointerDown={(e) => touchStart(e, 0, 1)}
            onPointerUp={release}
            onPointerCancel={release}
          >
            <ArrowUp />
          </button>
          <button
            aria-label="Move left"
            onPointerDown={(e) => touchStart(e, -1, 0)}
            onPointerUp={release}
            onPointerCancel={release}
          >
            <ArrowLeft />
          </button>
          <button
            aria-label="Move backward"
            onPointerDown={(e) => touchStart(e, 0, -1)}
            onPointerUp={release}
            onPointerCancel={release}
          >
            <ArrowDown />
          </button>
          <button
            aria-label="Move right"
            onPointerDown={(e) => touchStart(e, 1, 0)}
            onPointerUp={release}
            onPointerCancel={release}
          >
            <ArrowRight />
          </button>
        </div>
        <button
          className="sky-jump"
          onPointerDown={(e) => {
            e.preventDefault();
            move(touch.current.x, touch.current.z, true);
          }}
        >
          Jump
        </button>
      </div>
      <footer className="sky-footer">
        <span>Room {room.code}</span>
        <span>Checkpoint {player?.checkpoint ?? 0}/2</span>
        <button onClick={leave}>Leave</button>
      </footer>
    </section>
    </RotateGate>
  );
}
