import Link from "next/link";
import { ArrowUpRight, Users, Clock3 } from "lucide-react";
import type { GameInfo } from "@/lib/games";
import { GameCover } from "./game-cover";
export function GameCard({
  game,
  onPlay,
}: {
  game: GameInfo;
  onPlay?: () => void;
}) {
  return (
    <article className={`game-card game-${game.color}`}>
      <div className="game-card-art mystery-cover">
        <GameCover src={game.cover} title={game.name} />
        <span
          className={`status-pill ${game.status === "playable" ? "available" : ""}`}
        >
          {game.status === "playable" ? (
            <>
              <i /> Playable early case
            </>
          ) : (
            "Coming soon"
          )}
        </span>
      </div>
      <div className="game-card-body">
        <span className="category-label">{game.category}</span>
        <h3>{game.name}</h3>
        <p>{game.description}</p>
        <div className="game-meta">
          <span>
            <Users size={14} />
            {game.min}–{game.max} players
          </span>
          <span>
            <Clock3 size={14} />
            {game.duration}
          </span>
        </div>
        {game.status === "playable" ? (
          onPlay ? (
            <button className="card-link" onClick={onPlay}>
              Create a room <ArrowUpRight size={18} />
            </button>
          ) : (
            <Link href={`/play?game=${game.id}`} className="card-link">
              Let’s play <ArrowUpRight size={18} />
            </Link>
          )
        ) : (
          <span className="card-soon">A little more time in the lab.</span>
        )}
      </div>
    </article>
  );
}
