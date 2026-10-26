import { notFound } from "next/navigation";
import { NeonBreach } from "@/games/solo/neon-breach-v2";
import { SoloArcade } from "@/games/solo/solo-arcade";

export default async function SoloPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug !== "neon-breach" && slug !== "echo-grid") notFound();

  if (slug === "neon-breach") return <NeonBreach />;
  return <SoloArcade game="echo-grid" />;
}
