"use client";
import dynamic from "next/dynamic";

// The arena reads browser-only state (WebGL, pointer lock, localStorage), so it renders on the client only.
const ArenaGame = dynamic(() => import("./arena-game"), {
  ssr: false,
  loading: () => <main className="arena-loading" role="status" style={{ minHeight: "70vh", display: "grid", placeItems: "center", color: "#9fb4c9" }}>Loading MindBop Arena…</main>,
});

export function ArenaLoader() {
  return <ArenaGame />;
}
