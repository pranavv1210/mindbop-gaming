import type { LastGuestAction, LastGuestView } from "../games/last-guest/types";
export type Player = {
  id: string;
  name: string;
  avatar: number;
  connected: boolean;
  ready: boolean;
};
export type GameView = LastGuestView;
export type RoomView = {
  code: string;
  gameId: string;
  hostId: string;
  players: Player[];
  phase: "waiting" | "playing" | "completed";
  createdAt: number;
  game: GameView | null;
  serverTime: number;
};
export type Reply = { ok: true; code?: string } | { ok: false; error: string };
export type Command =
  | { type: "create"; name: string; avatar: number; gameId: string }
  | { type: "join"; code: string; name: string; avatar: number }
  | { type: "ready"; ready: boolean }
  | { type: "start" | "leave" | "rematch" }
  | { type: "game"; action: LastGuestAction };
export type Envelope = { id: string; command: Command };
export type ServerEvents = {
  "room:state": (room: RoomView | null) => void;
  session: (data: { id: string }) => void;
};
export type ClientEvents = {
  command: (envelope: Envelope, ack: (result: Reply) => void) => void;
  move: (input: { x: number; z: number }) => void;
};
