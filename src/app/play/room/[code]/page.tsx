"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Link2, Brain, Check, Play } from "lucide-react";
import { useGame } from "@/components/game-provider";
import { RoomPlayers } from "@/components/room-players";
import { BrainwavePlay, Results } from "@/components/brainwave-play";
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
      <div className="room-layout">
        {room.phase === "waiting" ? (
          <section className="room-panel">
            <span className="room-eyebrow">
              <Brain size={16} />
              Brainwave lobby
            </span>
            <h1>The crew’s getting together.</h1>
            <p>
              Send the invite, get comfortable, and prepare to overthink a few
              very simple questions.
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
            <div className="room-settings">
              <label>
                Number of rounds
                <select
                  aria-label="Number of rounds"
                  value={room.rounds}
                  disabled={!host || busy || !connected}
                  onChange={(e) =>
                    void act({
                      type: "settings",
                      rounds: Number(e.target.value),
                    })
                  }
                >
                  <option value={3}>3 rounds</option>
                  <option value={5}>5 rounds</option>
                  <option value={8}>8 rounds</option>
                </select>
              </label>
              <p className="form-note">
                20 seconds per question.
                <br />
                Changing rounds resets everyone’s ready state.
              </p>
            </div>
            <div className="rules">
              <h3>Small questions. Big brain energy.</h3>
              <ol>
                <li>Everyone gets the same logic question at the same time.</li>
                <li>Pick one answer before time runs out. No take-backs.</li>
                <li>
                  Correct answers earn 100 points. Speed doesn’t affect your
                  score.
                </li>
                <li>The highest score wins. Ties share the crown.</li>
              </ol>
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
        ) : room.phase === "completed" ? (
          <Results
            room={room}
            host={host}
            busy={busy}
            connected={connected}
            act={act}
            leave={() => void act({ type: "leave" })}
          />
        ) : (
          <BrainwavePlay
            room={room}
            act={act}
            busy={busy}
            connected={connected}
          />
        )}
        <RoomPlayers room={room} id={id} />
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
