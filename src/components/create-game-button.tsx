"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useGame } from "@/components/game-provider";

export function CreateGameButton({ gameId }: { gameId: string }) {
  const { connected, guest, room, send } = useGame();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function createRoom() {
    if (busy) return;
    if (room) {
      router.push(`/play/room/${room.code}`);
      return;
    }
    if (!guest || !connected) return;
    setBusy(true);
    setError("");
    const result = await send({ type: "create", ...guest, gameId });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.code) router.push(`/play/room/${result.code}`);
  }

  return (
    <>
      <button
        className="button button-primary button-large"
        type="button"
        disabled={busy || (!room && (!connected || !guest))}
        onClick={() => void createRoom()}
      >
        {room ? "Return to room" : busy ? "Creating room…" : "Create room"}
        <ArrowUpRight />
      </button>
      {error && <span className="game-create-error" role="alert">{error}</span>}
    </>
  );
}
