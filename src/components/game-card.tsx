"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router=useRouter();
  const activate = () => {
    if (game.status !== "playable") return;
    if (game.mode === "solo" && game.route) router.push(game.route);
    else if (onPlay) onPlay();
    else router.push(`/play?game=${game.id}`);
  };
  return (
    <article className={`game-card game-${game.color} ${game.status === "playable" ? "clickable" : ""}`} role={game.status === "playable" ? "link" : undefined} tabIndex={game.status === "playable" ? 0 : undefined} onClick={activate} onKeyDown={(event)=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();activate()}}}>
      <div className="game-card-art mystery-cover">
        <GameCover src={game.cover} title={game.name} />
        <span
          className={`status-pill ${game.status === "playable" ? "available" : ""}`}
        >
          {game.status === "playable" ? (
            <>
              <i /> Play now
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
            {game.mode === "solo" ? "Single player" : `${game.min}–${game.max} players`}
          </span>
          <span>
            <Clock3 size={14} />
            {game.duration}
          </span>
        </div>
        {game.status === "playable" ? (
          game.mode === "solo" && game.route ? (
            <Link href={game.route} className="card-link" onClick={(event)=>event.stopPropagation()}>
              Enter challenge <ArrowUpRight size={18} />
            </Link>
          ) : onPlay ? (
            <button className="card-link" onClick={(event)=>{event.stopPropagation();onPlay()}}>
              Create a room <ArrowUpRight size={18} />
            </button>
          ) : (
            <Link href={`/play?game=${game.id}`} className="card-link" onClick={(event)=>event.stopPropagation()}>
              Let’s play <ArrowUpRight size={18} />
            </Link>
          )
        ) : (
          <span className="card-soon">In development</span>
        )}
      </div>
    </article>
  );
}
