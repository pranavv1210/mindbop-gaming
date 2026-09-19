import { Crown } from "lucide-react";
import type { RoomView } from "@/lib/protocol";
import { Avatar } from "./art";
export function RoomPlayers({ room, id }: { room: RoomView; id: string }) {
  return (
    <aside className="players-panel">
      <h2>
        Your crew <span>{room.players.length}/8 players</span>
      </h2>
      <div>
        {room.players.map((p) => (
          <div className="player-row" key={p.id}>
            <Avatar index={p.avatar} />
            <div className="player-info">
              <strong>
                {p.name}
                {p.id === id ? " (you)" : ""}
              </strong>
              <small>
                {p.id === room.hostId && (
                  <>
                    <Crown size={10} /> Host
                  </>
                )}
                {!p.connected && " · Reconnecting"}
              </small>
            </div>
            <span
              className={`player-state ${p.ready || room.phase !== "waiting" ? "" : "waiting"}`}
            >
              {!p.connected
                ? "Offline"
                : room.phase !== "waiting"
                  ? `${p.score} pts`
                  : p.ready
                    ? "✓ Ready"
                    : "Not ready"}
            </span>
          </div>
        ))}
      </div>
      <p className="players-note">
        {room.phase === "waiting"
          ? "The host can start once everyone is ready. Share the invite link to get your people in here."
          : "Every correct answer earns 100 points. The highest score wins; equal scores share the win."}
      </p>
      <p className="players-note">
        Disconnected players have 2 minutes to return. Hosting passes to a
        connected player automatically.
      </p>
    </aside>
  );
}
