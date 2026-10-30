import type { Metadata } from "next";
import { ArenaLoader } from "@/games/arena/arena-loader";

export const metadata: Metadata = {
  title: "MindBop Arena",
  description: "Fast first-person team combat. Pick a hero, grab a weapon, and drop into a 6v6 match in seconds.",
};

export default function ArenaPage() {
  return <ArenaLoader />;
}
