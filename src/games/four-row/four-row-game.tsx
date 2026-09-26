"use client";
import { useState } from "react";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";
import { useGame } from "@/components/game-provider";
import { Avatar } from "@/components/art";
import type { RoomView } from "@/lib/protocol";
import type { FourRowView } from "./types";

export function FourRowGame({
  room,
  leave,
  rematch,
}: {
  room: RoomView<FourRowView>;
  leave: () => void;
  rematch: () => void;
}) {
  const { id, connected, send } = useGame();
  const game = room.game?.kind === "four-row" ? room.game : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!game) return null;
  const match = game;
  const me = room.players.find((player) => player.id === id);
  const opponent = room.players.find((player) => player.id !== id);
  const current = room.players.find((player) => player.id === match.turn);
  const winner = room.players.find((player) => player.id === match.winner);
  const myToken = match.playerIds.indexOf(id) + 1;
  const isOver = Boolean(match.winner || match.draw);
  async function drop(column: number) {
    if (busy || isOver || match.turn !== id) return;
    setBusy(true);
    setError("");
    const result = await send({
      type: "game",
      action: { type: "drop", column },
    });
    if (!result.ok) setError(result.error);
    setBusy(false);
  }
  return (
    <div className="four-row-arena">
      <header className="four-row-topbar">
        <button className="text-link plain-button" onClick={leave}>
          <ArrowLeft size={17} />
          Leave table
        </button>
        <div>
          <span>Private match</span>
          <strong>Four in a Row</strong>
        </div>
        <span className={`connection ${connected ? "" : "offline"}`}>
          <i />
          {connected ? "Live" : "Reconnecting"}
        </span>
      </header>
      <section className="four-row-stage">
        <div className="match-player token-one">
          <Avatar index={room.players[0]?.avatar ?? 0} />
          <div>
            <small>Golden discs</small>
            <strong>{room.players[0]?.name}</strong>
          </div>
          {game.turn === room.players[0]?.id && !isOver && <span>Playing</span>}
        </div>
        <div className="match-status" aria-live="polite">
          {isOver ? (
            <Trophy size={22} />
          ) : (
            <span
              className={`turn-disc disc-${game.playerIds.indexOf(game.turn) + 1}`}
            />
          )}
          <strong>
            {winner
              ? `${winner.name} wins!`
              : game.draw
                ? "It’s a draw"
                : game.turn === id
                  ? "Your turn"
                  : `${current?.name}’s turn`}
          </strong>
          <small>
            {isOver
              ? "Good game. Run it back?"
              : game.turn === id
                ? "Drop a disc into any open column."
                : "Watch the board—block the next four."}
          </small>
        </div>
        <div className="match-player token-two">
          <Avatar index={room.players[1]?.avatar ?? 1} />
          <div>
            <small>Violet discs</small>
            <strong>{room.players[1]?.name}</strong>
          </div>
          {game.turn === room.players[1]?.id && !isOver && <span>Playing</span>}
        </div>
        <div className="four-row-board-wrap">
          <div className="column-controls" aria-label="Choose a column">
            {Array.from({ length: 7 }, (_, column) => (
              <button
                key={column}
                aria-label={`Drop disc in column ${column + 1}`}
                disabled={
                  !connected ||
                  busy ||
                  isOver ||
                  game.turn !== id ||
                  game.board[0][column] !== 0
                }
                onClick={() => void drop(column)}
              >
                <span className={`preview-disc disc-${myToken}`} />
              </button>
            ))}
          </div>
          <div
            className="four-row-board"
            role="grid"
            aria-label="Four in a Row board"
          >
            {game.board.flatMap((row, r) =>
              row.map((cell, c) => {
                const winning = game.winningCells.some(
                  ([wr, wc]) => wr === r && wc === c,
                );
                return (
                  <div
                    key={`${r}-${c}`}
                    role="gridcell"
                    aria-label={
                      cell
                        ? `${cell === 1 ? room.players[0]?.name : room.players[1]?.name} disc`
                        : "Empty"
                    }
                    className={`board-slot ${winning ? "winning" : ""}`}
                  >
                    <span className={cell ? `disc-${cell}` : ""} />
                  </div>
                );
              }),
            )}
          </div>
        </div>
        {error && (
          <p className="error-message four-row-error" role="alert">
            {error}
          </p>
        )}
        <div className="four-row-footer">
          <p>
            <strong>{me?.name}</strong> vs <strong>{opponent?.name}</strong> ·
            First to connect four horizontally, vertically, or diagonally wins.
          </p>
          {isOver && room.hostId === id && (
            <button className="button button-primary" onClick={rematch}>
              <RotateCcw size={17} />
              Play again
            </button>
          )}
          {isOver && room.hostId !== id && (
            <span>Waiting for the host to start a rematch.</span>
          )}
        </div>
      </section>
    </div>
  );
}
