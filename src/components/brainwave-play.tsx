"use client";
import { useEffect, useState } from "react";
import { Clock3, CheckCircle2, Trophy } from "lucide-react";
import type { Command, RoomView } from "@/lib/protocol";
import { Avatar } from "./art";
export function BrainwavePlay({
  room,
  act,
  busy,
  connected,
}: {
  room: RoomView;
  act: (command: Command) => Promise<void>;
  busy: boolean;
  connected: boolean;
}) {
  const game = room.game!;
  const [now, setNow] = useState(room.serverTime);
  useEffect(() => {
    const received = Date.now();
    const timer = setInterval(
      () => setNow(room.serverTime + Date.now() - received),
      200,
    );
    return () => clearInterval(timer);
  }, [room.serverTime]);
  const remaining = Math.max(0, Math.ceil((game.deadline - now) / 1000));
  const reveal = game.phase === "reveal";
  return (
    <section className="room-panel" aria-label="Brainwave gameplay">
      <div className="question-top">
        <span className="question-counter">
          Brainwave · Round {game.round} of {game.total}
        </span>
        <span
          className={`timer ${remaining <= 5 && !reveal ? "urgent" : ""}`}
          role="timer"
          aria-label={`${remaining} seconds remaining`}
        >
          <Clock3 size={15} />
          {remaining}s
        </span>
      </div>
      <div className="progress-track" aria-hidden="true">
        <span
          style={{
            width: `${Math.min(100, (remaining / (reveal ? 6 : 20)) * 100)}%`,
          }}
        />
      </div>
      <h1 className="question-title">{game.question}</h1>
      <div className="answers">
        {game.options.map((option, index) => (
          <button
            key={`${game.round}:${index}`}
            className={`answer ${game.selected === index ? "selected" : ""} ${reveal && game.correct === index ? "correct" : ""} ${reveal && game.selected === index && game.correct !== index ? "wrong" : ""}`}
            disabled={
              busy ||
              !connected ||
              game.selected !== null ||
              reveal ||
              remaining === 0
            }
            aria-pressed={game.selected === index}
            onClick={() =>
              void act({ type: "answer", option: index, round: game.round })
            }
          >
            <span>
              {reveal && game.correct === index
                ? "✓"
                : String.fromCharCode(65 + index)}
            </span>
            {option}
            {game.selected === index && <CheckCircle2 size={16} />}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        {reveal ? (
          <div className="answer-feedback">
            <strong>
              {game.selected === game.correct
                ? "Nailed it. +100 points!"
                : game.selected === null
                  ? "Time’s up. Here’s the answer."
                  : "A good twist, right? Here’s why."}
            </strong>
            <p>{game.explanation}</p>
            <p>
              {game.round === game.total ? "Final scores" : "Next question"} in{" "}
              {remaining}s.
            </p>
          </div>
        ) : (
          <p className="answer-waiting">
            {game.selected !== null ? (
              <>
                <CheckCircle2 size={17} /> Answer locked. Waiting for the crew…
              </>
            ) : (
              "Choose carefully. Your first answer is final."
            )}{" "}
            <span>
              {game.answered}/{room.players.length} answered
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
export function Results({
  room,
  host,
  busy,
  connected,
  act,
  leave,
}: {
  room: RoomView;
  host: boolean;
  busy: boolean;
  connected: boolean;
  act: (command: Command) => Promise<void>;
  leave: () => void;
}) {
  const ranked = [...room.players].sort((a, b) => b.score - a.score);
  const winners = ranked.filter((p) => p.score === ranked[0]?.score);
  return (
    <section className="room-panel results">
      <div className="trophy">
        <Trophy size={42} />
      </div>
      <span className="room-eyebrow" style={{ justifyContent: "center" }}>
        Brainwave · {room.rounds} rounds complete
      </span>
      <h1>
        {winners.length > 1
          ? "Great minds think alike."
          : `${winners[0]?.name ?? "Your crew"} takes the crown!`}
      </h1>
      <p>
        {winners.length > 1
          ? `${winners.length} players share the win. Settle it with a rematch?`
          : "Bragging rights: earned. Friendship: hopefully intact."}
      </p>
      <div className="score-list">
        {ranked.map((p, index) => (
          <div className="score-row" key={p.id}>
            <span className="rank">
              {ranked.findIndex((other) => other.score === p.score) + 1}
            </span>
            <Avatar index={p.avatar} />
            <strong>
              {p.name}
              {index === 0 && " ✦"}
            </strong>
            <span>
              {p.score} <small>pts</small>
            </span>
          </div>
        ))}
      </div>
      <div className="room-actions">
        {host ? (
          <button
            disabled={busy || !connected}
            className="button button-primary"
            onClick={() => void act({ type: "rematch" })}
          >
            One more round
          </button>
        ) : (
          <p className="form-note">
            Your host can bring everyone back to the lobby.
          </p>
        )}
        <button
          className="button button-outline"
          disabled={busy || !connected}
          onClick={leave}
        >
          Back to game hub
        </button>
      </div>
    </section>
  );
}
