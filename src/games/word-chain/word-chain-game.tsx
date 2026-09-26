"use client";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, Trophy } from "lucide-react";
import { useGame } from "@/components/game-provider";
import { Avatar } from "@/components/art";
import type { RoomView } from "@/lib/protocol";
import type { WordChainView } from "./types";

export function WordChainGame({
  room,
  leave,
  rematch,
}: {
  room: RoomView<WordChainView>;
  leave: () => void;
  rematch: () => void;
}) {
  const { id, connected, send } = useGame();
  const game = room.game!;
  const [word, setWord] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const winner = room.players.find((p) => p.id === game.winner);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const result = await send({ type: "game", action: { type: "word", word } });
    if (!result.ok) setError(result.error);
    else setWord("");
    setBusy(false);
  }
  return (
    <div className="party-game word-chain-game">
      <header className="party-game-header">
        <button className="text-link plain-button" onClick={leave}>
          <ArrowLeft size={17} />
          Leave game
        </button>
        <div>
          <span>Word survival</span>
          <h1>Word Chain</h1>
        </div>
        <span className={`connection ${connected ? "" : "offline"}`}>
          <i />
          {connected ? "Live" : "Reconnecting"}
        </span>
      </header>
      <section className="word-stage">
        <div className="word-letter">
          <small>Next word starts with</small>
          <strong>{game.currentLetter}</strong>
        </div>
        <div className="word-scoreboard">
          {room.players.map((p) => (
            <div key={p.id} className={game.turn === p.id ? "active" : ""}>
              <Avatar index={p.avatar} />
              <span>
                {p.name}
                {p.id === id ? " (you)" : ""}
              </span>
              <strong>{game.scores[p.id]}/5</strong>
            </div>
          ))}
        </div>
        {winner ? (
          <div className="party-result">
            <Trophy />
            <h2>{winner.name} wins the chain!</h2>
            <p>Five clean words. No broken links.</p>
            {room.hostId === id ? (
              <button className="button button-primary" onClick={rematch}>
                <RotateCcw size={17} />
                Play again
              </button>
            ) : (
              <span>Waiting for the host to run it back.</span>
            )}
          </div>
        ) : (
          <>
            <div className="word-history">
              {game.words.length ? (
                game.words.slice(-7).map((entry, i) => (
                  <span key={`${entry.word}-${i}`}>
                    {entry.word}
                    {i < game.words.slice(-7).length - 1 && <ArrowRight />}
                  </span>
                ))
              ) : (
                <p>
                  The chain starts with <strong>S</strong>. Try “spark”.
                </p>
              )}
            </div>
            <form className="word-entry" onSubmit={submit}>
              <label>
                <span>
                  {game.turn === id
                    ? "Your turn"
                    : `${room.players.find((p) => p.id === game.turn)?.name} is thinking…`}
                </span>
                <input
                  aria-label="Your word"
                  value={word}
                  onChange={(e) =>
                    setWord(e.target.value.toLowerCase().replace(/[^a-z]/g, ""))
                  }
                  placeholder={`${game.currentLetter}…`}
                  minLength={3}
                  maxLength={18}
                  disabled={game.turn !== id || busy || !connected}
                />
              </label>
              <button
                className="button button-primary"
                disabled={
                  game.turn !== id || word.length < 3 || busy || !connected
                }
              >
                Lock word <ArrowRight size={17} />
              </button>
            </form>
          </>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <p className="party-rule">
          Use a real word, start with the glowing letter, and never repeat a
          word. First to five wins.
        </p>
      </section>
    </div>
  );
}
