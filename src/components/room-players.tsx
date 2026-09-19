import { Crown } from "lucide-react";
import type { RoomView } from "@/lib/protocol";
import { games } from "@/lib/games";
import { Avatar } from "./art";
export function RoomPlayers({ room, id }: { room: RoomView; id: string }) {
  return (
    <aside className="players-panel">
      <h2>
        Your crew{" "}
        <span>
          {room.players.length}/{games.find((g) => g.id === room.gameId)?.max}{" "}
          players
        </span>
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
                  ? "Investigating"
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
          : "All evidence and notes are shared. Build the case together."}
      </p>
      <p className="players-note">
        Disconnected players have 2 minutes to return. Hosting passes to a
        connected player automatically.
      </p>
    </aside>
  );
}
