"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Link2, Hotel, Check, Play } from "lucide-react";
import { useGame } from "@/components/game-provider";
import { RoomPlayers } from "@/components/room-players";
import { LastGuestGame } from "@/games/last-guest/last-guest-game";
import { Modal } from "@/components/modal";
import type { Command } from "@/lib/protocol";
export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const {
    room,
    id,
    guest,
    connected,
    initialized,
    connectionError,
    retry,
    send,
  } = useGame();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);
  async function act(command: Command) {
    if (busy) return;
    setBusy(true);
    setError("");
    const result = await send(command);
    setBusy(false);
    if (!result.ok) setError(result.error);
    else if (command.type === "leave") router.push("/play");
  }
  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      setToast(message);
    } catch {
      setToast("Copy is unavailable. Select and copy the room code above.");
    }
  }
  if (!initialized)
    return (
      <main id="main" className="loading-page">
        <span className="loader" />
        Getting the room ready…
      </main>
    );
  if (!room || room.code !== code.toUpperCase())
    return (
      <main id="main" className="container app-main">
        <div className="room-panel">
          <h1>
            {room
              ? "You’re already in another room."
              : "Your crew is one click away."}
          </h1>
          <p>
            {room
              ? "Return to your current room and leave it before joining another."
              : `Join room ${code.toUpperCase()} as ${guest?.name ?? "a guest"}.`}
          </p>
          {connectionError && (
            <p className="notice">
              {connectionError} <button onClick={retry}>Reconnect</button>
            </p>
          )}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <div className="room-actions">
            {room ? (
              <Link
                className="button button-primary"
                href={`/play/room/${room.code}`}
              >
                Return to room
              </Link>
            ) : (
              <button
                className="button button-primary"
                disabled={!guest || !connected || busy}
                onClick={() =>
                  guest &&
                  void act({ type: "join", code: code.toUpperCase(), ...guest })
                }
              >
                {busy ? "Joining…" : "Join this room"}
              </button>
            )}
            <Link className="button button-outline" href="/play">
              Go to game hub
            </Link>
          </div>
        </div>
      </main>
    );
  const player = room.players.find((p) => p.id === id);
  const host = room.hostId === id;
  const canStart =
    room.players.length >= 2 &&
    room.players.every((p) => p.ready && p.connected);
  return (
    <main id="main" className="container app-main">
      <div className="room-topline">
        <button
          className="text-link plain-button"
          onClick={() => setConfirmLeave(true)}
        >
          <ArrowLeft size={16} />
          Leave room
        </button>
        <span className={`connection ${connected ? "" : "offline"}`}>
          <i />
          {connected ? "You’re connected" : "Reconnecting…"}
        </span>
      </div>
      {connectionError && (
        <div className="notice" role="status">
          {connectionError}{" "}
          <button className="plain-button text-link" onClick={retry}>
            Reconnect
          </button>
        </div>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <div className={room.phase === "waiting" ? "room-layout" : ""}>
        {room.phase === "waiting" ? (
          <section className="room-panel">
            <span className="room-eyebrow">
              <Hotel size={16} />
              The Last Guest lobby
            </span>
            <h1>The crew’s getting together.</h1>
            <p>
              Invite your investigators. Explore the hotel, compare evidence,
              and agree on what happened.
            </p>
            <div className="invite-box">
              <div>
                <small>Your private room code</small>
                <div className="room-code" data-testid="room-code">
                  {room.code}
                </div>
              </div>
              <div className="invite-actions">
                <button
                  className="icon-button"
                  aria-label="Copy room code"
                  onClick={() => void copy(room.code, "Room code copied!")}
                >
                  <Copy size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Copy invite link"
                  onClick={() =>
                    void copy(
                      `${window.location.origin}/play?join=${room.code}`,
                      "Invite link copied. Send it to your crew!",
                    )
                  }
                >
                  <Link2 size={18} />
                </button>
              </div>
            </div>
            <p className="toast" role="status">
              {toast}
            </p>
            <div className="rules">
              <h3>One hotel. Three suspects. One shared case.</h3>
              <ol>
                <li>
                  Explore five connected hotel areas using WASD, arrows, or
                  touch controls.
                </li>
                <li>
                  Inspect objects and question suspects. Discoveries are shared
                  automatically.
                </li>
                <li>Connect evidence and coordinate in the team notebook.</li>
                <li>
                  Submit a supported accusation with everyone’s agreement.
                </li>
              </ol>
              <p className="players-note">
                Early playable milestone: one compact case, procedural 3D art,
                no voice chat. Progress is kept during short disconnects, but
                not server restarts.
              </p>
            </div>
            <div className="room-actions">
              <button
                className={`button ${player?.ready ? "button-outline" : "button-primary"}`}
                disabled={busy || !connected}
                onClick={() =>
                  void act({ type: "ready", ready: !player?.ready })
                }
              >
                <Check size={17} />
                {player?.ready ? "Ready! (undo)" : "I’m ready"}
              </button>
              {host && (
                <button
                  className="button button-dark"
                  disabled={busy || !connected || !canStart}
                  onClick={() => void act({ type: "start" })}
                >
                  <Play size={16} />
                  {busy ? "Starting…" : "Start game"}
                </button>
              )}
            </div>
            <p className="players-note">
              {room.players.length < 2
                ? "Invite at least one friend to start. Open an incognito window to try a second player on this computer."
                : !canStart
                  ? "Waiting for everyone to get ready…"
                  : host
                    ? "Everyone’s ready. Let’s do this."
                    : "Everyone’s ready. Your host can start the game."}
            </p>
          </section>
        ) : (
          <LastGuestGame
            key={room.game!.runId}
            room={room}
            leave={() => void act({ type: "leave" })}
            rematch={() => void act({ type: "rematch" })}
          />
        )}
        {room.phase === "waiting" && <RoomPlayers room={room} id={id} />}
      </div>
      {confirmLeave && (
        <Modal
          title="Heading out?"
          description="You’ll leave this room. If you’re hosting, a connected player takes over. You can rejoin while the room is waiting."
          close={() => setConfirmLeave(false)}
        >
          <div className="room-actions">
            <button
              className="button button-outline"
              onClick={() => setConfirmLeave(false)}
            >
              Keep playing
            </button>
            <button
              className="button button-primary"
              disabled={busy || !connected}
              onClick={() => {
                setConfirmLeave(false);
                void act({ type: "leave" });
              }}
            >
              Leave room
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
