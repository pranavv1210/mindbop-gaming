import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft,ArrowUpRight,Clock3,Link2,Users } from "lucide-react";
import { GameCover } from "@/components/game-cover";
import { games } from "@/lib/games";

export function generateStaticParams(){return games.filter(game=>game.mode==="multiplayer").map(game=>({slug:game.id}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const game=games.find(item=>item.id===slug);if(!game)return{};return{title:game.name,description:game.description,openGraph:{images:[game.cover]}}}
const extras:Record<string,{tagline:string;features:string[]}>= {
 mafia:{tagline:"Trust nobody after dark.",features:["Secret roles","Day and night cycles","Private role actions","Live discussion and voting","Reconnect support"]},
 "two-truths":{tagline:"You know your friends. Right?",features:["Private lie selection","Live reactions","Locked voting","Server-scored bluffs","Play-again rooms"]},
 "sky-scramble":{tagline:"Run. Jump. Fall. Somehow survive.",features:["Real 3D arena","Desktop and touch controls","Checkpoints and respawns","Qualification rounds","Server-validated movement"]},
 "mindbop-draw":{tagline:"Draw badly. Guess brilliantly.",features:["Shared live canvas","Fresh word choices","Timed hints","Color and brush tools","Server-scored rounds"]},
 "comedy-chaos":{tagline:"Your friends wrote it. You just have to read it.",features:["Anonymous answers","Performance mode","Double Down voting","Guess the author","Server-scored reveals"]},
};
export default async function GameDetail({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const game=games.find(item=>item.id===slug&&item.mode==="multiplayer");if(!game)notFound();const extra=extras[game.id]??{tagline:"Bring the group chat to life.",features:["Private rooms","Live multiplayer","Responsive play"]};return <main id="main" className={`game-detail detail-${game.id}`}><nav className="container"><Link href="/play" className="text-link"><ArrowLeft/> All games</Link></nav><section className="container game-detail-hero"><div className="game-detail-cover"><GameCover src={game.cover} title={game.name}/></div><div className="game-detail-copy"><span>{game.category}</span><h1>{game.name}</h1><h2>{extra.tagline}</h2><p>{game.description}</p><div className="game-detail-meta"><span><Users/> {game.min}–{game.max} players</span><span><Clock3/> {game.duration}</span></div><ul>{extra.features.map(feature=><li key={feature}>{feature}</li>)}</ul><div className="room-actions"><Link className="button button-primary button-large" href={`/play?game=${game.id}`}>Create room <ArrowUpRight/></Link><Link className="button button-outline button-large" href="/play?join=">Join room <Link2/></Link></div></div></section></main>}
