"use client";
import { useState } from "react";
import { ArrowLeft, Check, RotateCcw, Trophy } from "lucide-react";
import { useGame } from "@/components/game-provider";
import { Avatar } from "@/components/art";
import type { RoomView } from "@/lib/protocol";
import type { QuizRushView } from "./types";

export function QuizRushGame({
  room,
  leave,
  rematch,
}: {
  room: RoomView<QuizRushView>;
  leave: () => void;
  rematch: () => void;
}) {
  const { id, connected, send } = useGame();
  const game = room.game!;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const answered = game.answered.includes(id);
  async function answer(option: number) {
    if (busy || answered) return;
    setBusy(true);
    setError("");
    const result = await send({
      type: "game",
      action: { type: "answer", option },
    });
    if (!result.ok) setError(result.error);
    setBusy(false);
  }
  const winners = room.players.filter((p) => game.winnerIds.includes(p.id));
  return (
    <div className="party-game quiz-rush-game">
      <header className="party-game-header">
        <button className="text-link plain-button" onClick={leave}>
          <ArrowLeft size={17} />
          Leave quiz
        </button>
        <div>
          <span>Fast facts</span>
          <h1>Quiz Rush</h1>
        </div>
        <span className={`connection ${connected ? "" : "offline"}`}>
          <i />
          {connected ? "Live" : "Reconnecting"}
        </span>
      </header>
      <section className="quiz-stage">
        <div className="quiz-scoreboard">
          {room.players.map((p) => (
            <div key={p.id}>
              <Avatar index={p.avatar} />
              <span>{p.name}</span>
              <strong>{game.scores[p.id]}</strong>
              {game.answered.includes(p.id) && <Check size={15} />}
            </div>
          ))}
        </div>
        {game.finished ? (
          <div className="party-result">
            <Trophy />
            <h2>
              {winners.length > 1 ? "It’s a tie!" : `${winners[0]?.name} wins!`}
            </h2>
            <p>
              Final score: {Math.max(...Object.values(game.scores))} out of{" "}
              {game.totalRounds}
            </p>
            {room.hostId === id ? (
              <button className="button button-primary" onClick={rematch}>
                <RotateCcw size={17} />
                New quiz
              </button>
            ) : (
              <span>Waiting for the host to start another quiz.</span>
            )}
          </div>
        ) : (
          <>
            <div className="quiz-progress">
              <span>
                Question {game.round + 1} of {game.totalRounds}
              </span>
              <i
                style={{
                  width: `${((game.round + 1) / game.totalRounds) * 100}%`,
                }}
              />
            </div>
            <h2>{game.prompt}</h2>
            <div className="quiz-options">
              {game.options.map((option, index) => (
                <button
                  key={option}
                  disabled={answered || busy || !connected}
                  onClick={() => void answer(index)}
                >
                  <span>{String.fromCharCode(65 + index)}</span>
                  {option}
                </button>
              ))}
            </div>
            {answered && (
              <div
                className={`answer-lock ${game.lastResult[id] ? "correct" : ""}`}
              >
                {game.lastResult[id]
                  ? "Correct! Point secured."
                  : "Answer locked."}{" "}
                Waiting for everyone…
              </div>
            )}
          </>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
