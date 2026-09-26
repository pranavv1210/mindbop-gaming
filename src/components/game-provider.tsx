"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientEvents,
  Command,
  Reply,
  RoomView,
  ServerEvents,
} from "@/lib/protocol";
import { readGuest, saveGuest, saveRecent, type Guest } from "@/lib/storage";
import { actionId } from "@/lib/action-id";
import { useAccount } from "./account-provider";
type Context = {
  guest: Guest | null;
  updateGuest: (guest: Guest) => void;
  id: string;
  // Game screens narrow the registry-provided view using `game.kind`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  room: RoomView<any> | null;
  connected: boolean;
  initialized: boolean;
  connectionError: string;
  send: (command: Command) => Promise<Reply>;
  retry: () => void;
  move: (x: number, z: number) => void;
};
const GameContext = createContext<Context | null>(null);
export function GameProvider({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAccount();
  const [guest, setGuest] = useState<Guest | null>(null);
  const [id, setId] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [room, setRoom] = useState<RoomView<any> | null>(null);
  const [connected, setConnected] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [generation, setGeneration] = useState(0);
  const socketRef = useRef<Socket<ServerEvents, ClientEvents> | null>(null);
  useEffect(() => {
    const saved = readGuest();
    saveGuest(saved);
    // Hydrate browser-only preferences independently of multiplayer availability.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGuest(saved);
  }, []);
  useEffect(() => {
    let disposed = false;
    let socket: Socket<ServerEvents, ClientEvents> | undefined;
    async function connect() {
      try {
        const res = await fetch("/api/session", {
          method: "POST",
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {},
          signal: AbortSignal.timeout(10000),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not connect.");
        if (disposed) return;
        setId(data.id);
        socket = io({ autoConnect: false });
        socketRef.current = socket;
        socket.on("connect", () => {
          setConnected(true);
          setConnectionError("");
        });
        socket.on("disconnect", () => {
          setConnected(false);
          setConnectionError("Connection lost. Reconnecting to your room…");
        });
        socket.on("connect_error", (error) => {
          setConnected(false);
          setInitialized(true);
          setConnectionError(
            error.message.includes("Session expired")
              ? error.message
              : "Can’t reach the game server. Check your connection and try again.",
          );
        });
        socket.on("session", (data) => setId(data.id));
        socket.on("room:state", (data) => {
          setRoom(data);
          setInitialized(true);
        });
        socket.connect();
      } catch (error) {
        if (!disposed) {
          setConnectionError(
            error instanceof Error ? error.message : "Could not connect.",
          );
          setInitialized(true);
        }
      }
    }
    void connect();
    return () => {
      disposed = true;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [generation, accessToken]);
  useEffect(() => {
    if (room?.phase === "completed") {
      const player = room.players.find((p) => p.id === id);
      if (player) {
        const outcome =
          room.game?.kind === "four-row"
            ? room.game.draw
              ? "Draw"
              : room.game.winner === id
                ? "Won"
                : "Lost"
            : room.game?.kind === "word-chain"
              ? room.game.winner === id
                ? "Won"
                : "Finished"
              : room.game?.kind === "quiz-rush"
                ? room.game.winnerIds.includes(id)
                  ? "Won"
                  : "Finished"
                : room.game?.result?.solved
                  ? "Case solved"
                  : "Case reviewed";
        saveRecent({
          gameId: room.gameId,
          outcome,
          playedAt: Date.now(),
          matchId: room.game!.runId,
        });
      }
    }
  }, [room, id]);
  const send = useCallback(async (command: Command): Promise<Reply> => {
    const socket = socketRef.current;
    if (!socket?.connected)
      return {
        ok: false,
        error: "You’re offline. Reconnect before trying again.",
      };
    // A retry uses the same action ID, so an acknowledged-late action cannot run twice.
    const envelope = { id: actionId(), command };
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await new Promise<Reply | null>((resolve) =>
        socket
          .timeout(5000)
          .emit("command", envelope, (error: Error | null, reply: Reply) =>
            resolve(error ? null : reply),
          ),
      );
      if (result) return result;
    }
    return {
      ok: false,
      error:
        "The server didn’t confirm your action. Check the room before retrying.",
    };
  }, []);
  return (
    <GameContext.Provider
      value={{
        guest,
        updateGuest: (g) => {
          saveGuest(g);
          setGuest(g);
        },
        id,
        room,
        connected,
        initialized,
        connectionError,
        send,
        move: (x, z) => {
          const socket = socketRef.current;
          if (socket?.connected) socket.volatile.emit("move", { x, z });
        },
        retry: () => {
          setConnectionError("");
          setGeneration((g) => g + 1);
        },
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
export function useGame() {
  const value = useContext(GameContext);
  if (!value) throw new Error("GameProvider is missing");
  return value;
}
