import { notFound } from "next/navigation";
import { SoloArcade } from "@/games/solo/solo-arcade";
export default async function SoloPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;if(slug!=="neon-breach"&&slug!=="echo-grid")notFound();return <SoloArcade game={slug}/>}
