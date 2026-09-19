"use client";
import { useEffect, useRef, useState } from "react";
import type { RoomView } from "@/lib/protocol";
import type { HotelScene } from "./hotel-scene";
export function HotelViewport({
  room,
  id,
  active,
  onPick,
}: {
  room: RoomView;
  id: string;
  active: boolean;
  onPick: (target: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<HotelScene | null>(null);
  const pick = useRef(onPick);
  const current = useRef(room);
  const activeRef = useRef(active);
  const [status, setStatus] = useState("Loading the hotel…");
  const [attempt, setAttempt] = useState(0);
  const [quality, setQuality] = useState("auto");
  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);
  useEffect(() => {
    current.current = room;
    scene.current?.update(room);
  }, [room]);
  useEffect(() => {
    activeRef.current = active;
    scene.current?.setActive(active);
  }, [active]);
  useEffect(() => {
    let disposed = false;
    let instance: HotelScene | null = null;
    import("./hotel-scene")
      .then(({ createHotel }) => {
        if (disposed || !canvas.current) return;
        try {
          instance = createHotel(
            canvas.current,
            id,
            (target) => pick.current(target),
            setStatus,
          );
          scene.current = instance;
          instance.update(current.current);
          instance.setActive(activeRef.current);
        } catch (e) {
          setStatus(
            e instanceof Error
              ? e.message
              : "The hotel could not load. Retry the scene.",
          );
        }
      })
      .catch(() => {
        if (!disposed)
          setStatus(
            "The 3D engine could not download. Check your connection and retry.",
          );
      });
    return () => {
      disposed = true;
      instance?.dispose();
      scene.current = null;
    };
  }, [id, attempt]);
  const ready = status.startsWith("Scene ready");
  const loading = status === "Loading the hotel…";
  return (
    <div className="hotel-viewport">
      <canvas
        ref={canvas}
        className="hotel-canvas"
        aria-label="3D Halcyon Hotel. Use the movement buttons or WASD, then inspect nearby objects."
        data-testid="hotel-canvas"
      />
      <div className="scene-quality">
        <label>
          Graphics
          <select
            aria-label="Graphics quality"
            value={quality}
            onChange={(e) => {
              setQuality(e.target.value);
              scene.current?.setQuality(e.target.value === "low");
            }}
          >
            <option value="auto" disabled>
              Auto
            </option>
            <option value="standard">Standard</option>
            <option value="low">Low</option>
          </select>
        </label>
      </div>
      <span className="scene-status" role="status" data-testid="scene-status">
        {status}
      </span>
      {!ready && (
        <div className="scene-loading">
          <strong>
            {loading ? "Opening the Halcyon…" : "The hotel view is unavailable"}
          </strong>
          <p>{status}</p>
          {!loading && (
            <>
              <button
                className="button button-primary"
                onClick={() => {
                  setStatus("Loading the hotel…");
                  setQuality("auto");
                  setAttempt((n) => n + 1);
                }}
              >
                Retry scene
              </button>
              <p>
                Your room and discoveries remain on the server. You can still
                review the shared board.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
