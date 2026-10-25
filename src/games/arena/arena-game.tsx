"use client";
import { useEffect, useRef, useState } from "react";
import { Crosshair, LogOut } from "lucide-react";
import { useGame } from "@/components/game-provider";
import type { RoomView } from "@/lib/protocol";
import type { ArenaScene } from "./arena-scene";
import type { ArenaView } from "./types";

export function ArenaGame({
  room,
  leave,
}: {
  room: RoomView<ArenaView>;
  leave: () => void;
}) {
  const { id, move } = useGame();
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<ArenaScene | null>(null);
  const latest = useRef(room.game!);
  const keys = useRef(new Set<string>());
  const [locked, setLocked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    latest.current = room.game!;
    scene.current?.update(room.game!);
  }, [room]);
  useEffect(() => {
    let disposed = false;
    let current: ArenaScene | null = null;
    import("./arena-scene").then(({ createArenaScene }) => {
      if (disposed || !canvas.current) return;
      current = createArenaScene(canvas.current, id);
      scene.current = current;
      current.update(latest.current);
      setLoaded(true);
    });
    return () => {
      disposed = true;
      current?.dispose();
      scene.current = null;
    };
  }, [id]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        ["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "Space"].includes(e.code)
      ) {
        e.preventDefault();
        keys.current.add(e.code);
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const mouse = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas.current)
        scene.current?.look(e.movementX, e.movementY);
    };
    const lock = () =>
      setLocked(document.pointerLockElement === canvas.current);
    const fire = () => {
      if (document.pointerLockElement === canvas.current) scene.current?.fire();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousemove", mouse);
    window.addEventListener("mousedown", fire);
    document.addEventListener("pointerlockchange", lock);
    const timer = setInterval(() => {
      const k = keys.current;
      move(
        (k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0),
        (k.has("KeyW") ? 1 : 0) - (k.has("KeyS") ? 1 : 0),
        k.has("Space"),
        k.has("ShiftLeft"),
      );
      k.delete("Space");
    }, 50);
    return () => {
      clearInterval(timer);
      move(0, 0);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousemove", mouse);
      window.removeEventListener("mousedown", fire);
      document.removeEventListener("pointerlockchange", lock);
    };
  }, [move]);
  return (
    <section className="arena-game">
      <canvas
        ref={canvas}
        aria-label="MindBop Arena first-person training map"
      />
      <div className="arena-brand">
        <strong>MINDBOP ARENA</strong>
        <span>Phase 1 movement range</span>
      </div>
      <div className="arena-roster">PLAYERS {room.players.length}/10</div>
      <Crosshair className="arena-crosshair" />
      {!locked && (
        <button
          className="arena-enter"
          disabled={!loaded}
          onClick={() => canvas.current?.requestPointerLock()}
        >
          <Crosshair />
          {loaded ? "Click to play" : "Loading arena…"}
          <small>
            WASD move · Shift sprint · Space jump · Mouse aim · Click fire · Esc
            release
          </small>
        </button>
      )}
      <footer className="arena-footer">
        <span>Room {room.code}</span>
        <span>{locked ? "Pointer locked · Esc releases" : "Pointer free"}</span>
        <button onClick={leave}>
          <LogOut />
          Leave
        </button>
      </footer>
    </section>
  );
}
