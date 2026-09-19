export type Player = {
  id: string;
  name: string;
  avatar: number;
  connected: boolean;
  ready: boolean;
  score: number;
};
export type GameView = {
  phase: "question" | "reveal" | "finished";
  round: number;
  total: number;
  question: string;
  options: string[];
  deadline: number;
  selected: number | null;
  answered: number;
  correct?: number;
  explanation?: string;
};
export type RoomView = {
  code: string;
  gameId: string;
  hostId: string;
  players: Player[];
  phase: "waiting" | "playing" | "completed";
  rounds: number;
  createdAt: number;
  game: GameView | null;
  serverTime: number;
};
export type Reply = { ok: true; code?: string } | { ok: false; error: string };
export type Command =
  | {
      type: "create";
      name: string;
      avatar: number;
      gameId: string;
      rounds: number;
    }
  | { type: "join"; code: string; name: string; avatar: number }
  | { type: "ready"; ready: boolean }
  | { type: "settings"; rounds: number }
  | { type: "start" | "leave" | "rematch" }
  | { type: "answer"; option: number; round: number };
export type Envelope = { id: string; command: Command };
export type ServerEvents = {
  "room:state": (room: RoomView | null) => void;
  session: (data: { id: string }) => void;
};
export type ClientEvents = {
  command: (envelope: Envelope, ack: (result: Reply) => void) => void;
};
