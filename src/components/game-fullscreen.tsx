"use client";
import { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

export function GameFullscreen({ targetId }: { targetId: string }) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const sync = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  async function toggle() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.getElementById(targetId)?.requestFullscreen();
  }
  return (
    <button type="button" className="game-fullscreen" onClick={() => void toggle()}
      aria-label={active ? "Exit full screen" : "Play in full screen"}
      title={active ? "Exit full screen" : "Play in full screen"}>
      {active ? <Minimize2 /> : <Maximize2 />}
      <span>{active ? "Exit full screen" : "Full screen"}</span>
    </button>
  );
}
