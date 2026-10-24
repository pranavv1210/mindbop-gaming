"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Check,
  Flame,
  LockKeyhole,
  Mic2,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Avatar } from "@/components/art";
import { useGame } from "@/components/game-provider";
import type { RoomView } from "@/lib/protocol";
import type { ComedyAction, ComedyView } from "./types";

export function ComedyGame({
  room,
  leave,
  rematch,
}: {
  room: RoomView<ComedyView>;
  leave: () => void;
  rematch: () => void;
}) {
  const { id, send } = useGame(),
    game = room.game!;
  const [now, setNow] = useState(room.serverTime),
    [text, setText] = useState(""),
    [selected, setSelected] = useState(""),
    [doubleDown, setDoubleDown] = useState(false),
    [guessPlayer, setGuessPlayer] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    const timer = setInterval(() => setNow((value) => value + 250), 250);
    return () => clearInterval(timer);
  }, []);
  const names = useMemo(
    () =>
      Object.fromEntries(
        room.players.map((player) => [player.id, player.name]),
      ),
    [room.players],
  );
  const seconds = Math.max(0, Math.ceil((game.deadline - now) / 1000));
  const submitted = game.submittedIds.includes(id);
  const ranking = [...room.players].sort(
    (a, b) => game.scores[b.id] - game.scores[a.id],
  );
  async function act(action: ComedyAction) {
    setError("");
    const result = await send({ type: "game", action });
    if (!result.ok) setError(result.error);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    await act({ type: "comedy-answer", text });
  }
  if (game.finished)
    return (
      <section className="comedy-game comedy-final">
        <div className="comedy-confetti" aria-hidden="true" />
        <Trophy />
        <p>Comedy Champion</p>
        <Avatar
          index={
            room.players.find((p) => p.id === game.winnerIds[0])?.avatar ?? 0
          }
        />
        <h1>{game.winnerIds.map((playerId) => names[playerId]).join(" & ")}</h1>
        <strong>{Math.max(...Object.values(game.scores))} points</strong>
        <div className="comedy-podium">
          {ranking.map((player, index) => (
            <div key={player.id}>
              <span>{index + 1}</span>
              <Avatar index={player.avatar} />
              <b>{player.name}</b>
              <strong>{game.scores[player.id]}</strong>
            </div>
          ))}
        </div>
        <div className="comedy-awards">
          {game.awards.map((award) => (
            <p key={award.title}>
              <Sparkles />
              <span>
                <small>{award.title}</small>
                <b>{names[award.playerId]}</b>
              </span>
            </p>
          ))}
        </div>
        <div className="room-actions">
          {room.hostId === id && (
            <button className="button button-primary" onClick={rematch}>
              Play again
            </button>
          )}
          <button className="button button-outline" onClick={leave}>
            Back to MindBop
          </button>
        </div>
      </section>
    );
  const title =
    game.phase === "prompt"
      ? `Round ${game.round}`
      : game.phase === "answering"
        ? "Write something funny."
        : game.phase === "performance"
          ? "Give it your best delivery."
          : game.phase === "voting"
            ? "Which answer wins the room?"
            : game.phase === "vote-results"
              ? "The room has spoken."
              : game.phase === "guessing"
                ? "Who wrote it?"
                : game.phase === "author-reveal"
                  ? "No way that was you."
                  : "Round results";
  return (
    <section className={`comedy-game comedy-${game.phase}`}>
      <div className="comedy-shapes" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <header className="comedy-hud">
        <strong>
          Comedy <em>Chaos</em>
        </strong>
        <span>
          Round {game.round}/{game.totalRounds}
        </span>
        <b className={seconds <= 5 ? "urgent" : ""}>
          {String(seconds).padStart(2, "0")}
          <small>sec</small>
        </b>
      </header>
      <div className="comedy-layout">
        <main>
          <div className="comedy-heading">
            <small>
              {game.prompt.format} · {game.prompt.category}
            </small>
            <h1>{title}</h1>
          </div>
          {game.phase === "prompt" && (
            <div className="prompt-stage">
              <Sparkles />
              <blockquote>{game.prompt.text}</blockquote>
              <p>Think fast. Your friends are the comedy engine.</p>
            </div>
          )}
          {game.phase === "answering" &&
            (submitted ? (
              <div className="comedy-locked">
                <LockKeyhole />
                <h2>Answer locked</h2>
                <p>
                  Your secret is safe. {game.submittedIds.length}/
                  {game.answers.length || room.players.length} players ready.
                </p>
              </div>
            ) : (
              <form className="comedy-writer" onSubmit={submit}>
                <blockquote>{game.prompt.text}</blockquote>
                <textarea
                  autoFocus
                  aria-label="Your funny answer"
                  placeholder="Type the answer that will ruin the group chat…"
                  maxLength={150}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                />
                <div>
                  <span>{text.length}/150</span>
                  <button
                    className="button button-primary"
                    disabled={!text.trim()}
                  >
                    Lock answer <LockKeyhole size={16} />
                  </button>
                </div>
              </form>
            ))}
          {game.phase === "performance" && (
            <div className="performance-card">
              <Mic2 />
              <small>Your answer to read</small>
              <blockquote>“{game.assignedAnswer?.text}”</blockquote>
              <p>Read it dramatically. The room deserves commitment.</p>
            </div>
          )}
          {(game.phase === "voting" ||
            game.phase === "vote-results" ||
            game.phase === "guessing" ||
            game.phase === "author-reveal") && (
            <div className="comedy-answer-grid">
              {game.answers.map((answer, index) => (
                <button
                  type="button"
                  key={answer.id}
                  className={`${selected === answer.id ? "selected" : ""} ${game.phase === "author-reveal" ? "revealed" : ""}`}
                  disabled={game.phase !== "voting" || game.voteLocked}
                  onClick={() => setSelected(answer.id)}
                >
                  <i>{index + 1}</i>
                  <p>“{answer.text}”</p>
                  {answer.votes !== undefined && (
                    <strong>
                      {answer.votes} vote{answer.votes === 1 ? "" : "s"}
                    </strong>
                  )}
                  {answer.authorId && (
                    <span>
                      <Avatar
                        small
                        index={
                          room.players.find((p) => p.id === answer.authorId)
                            ?.avatar ?? 0
                        }
                      />
                      <b>{names[answer.authorId]}</b>
                      <em>+{answer.points ?? 0}</em>
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {game.phase === "voting" && (
            <div className="comedy-vote-bar">
              <button
                type="button"
                className={`double-down ${doubleDown ? "active" : ""}`}
                disabled={!game.doubleDownAvailable || game.voteLocked}
                onClick={() => setDoubleDown((value) => !value)}
              >
                <Flame /> Double Down{" "}
                <small>{game.doubleDownAvailable ? "2× vote" : "used"}</small>
              </button>
              <button
                className="button button-primary"
                disabled={!selected || game.voteLocked}
                onClick={() =>
                  void act({
                    type: "comedy-vote",
                    answerId: selected,
                    doubleDown,
                  })
                }
              >
                {game.voteLocked ? (
                  <>
                    <Check /> Vote locked
                  </>
                ) : (
                  "Vote for this answer"
                )}
              </button>
            </div>
          )}
          {game.phase === "guessing" && (
            <div className="comedy-guess">
              <p>Choose one answer, then guess its author.</p>
              <div>
                {game.answers.map((answer) => (
                  <button
                    type="button"
                    className={selected === answer.id ? "selected" : ""}
                    key={answer.id}
                    onClick={() => setSelected(answer.id)}
                  >
                    {answer.text}
                  </button>
                ))}
              </div>
              <label>
                Who wrote it?
                <select
                  aria-label="Guess the author"
                  value={guessPlayer}
                  onChange={(event) => setGuessPlayer(event.target.value)}
                >
                  <option value="">Choose a player</option>
                  {room.players
                    .filter((player) => player.id !== id)
                    .map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                </select>
              </label>
              <button
                className="button button-primary"
                disabled={!selected || !guessPlayer || game.guessLocked}
                onClick={() =>
                  void act({
                    type: "comedy-guess",
                    answerId: selected,
                    playerId: guessPlayer,
                  })
                }
              >
                {game.guessLocked ? "Guess locked" : "Lock author guess"}
              </button>
            </div>
          )}
          {game.phase === "round-results" && (
            <div className="comedy-round-results">
              <h2>Round {game.round} results</h2>
              {ranking.map((player, index) => (
                <p key={player.id}>
                  <span>{index + 1}</span>
                  <Avatar small index={player.avatar} />
                  <b>{player.name}</b>
                  <em>+{game.roundGains[player.id] ?? 0}</em>
                  <strong>{game.scores[player.id]}</strong>
                </p>
              ))}
            </div>
          )}
        </main>
        <aside className="comedy-score">
          <h2>Scoreboard</h2>
          {ranking.map((player, index) => (
            <p key={player.id}>
              <span>{index + 1}</span>
              <Avatar small index={player.avatar} />
              <b>{player.name}</b>
              <strong>{game.scores[player.id]}</strong>
            </p>
          ))}
          <div>
            <small>Prompt</small>
            <p>{game.prompt.text}</p>
          </div>
        </aside>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <footer className="comedy-footer">
        <span>Room {room.code}</span>
        <span>Answers stay anonymous until the reveal.</span>
        <button onClick={leave}>Leave game</button>
      </footer>
    </section>
  );
}
