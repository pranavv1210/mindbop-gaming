import type { LastGuestAction, LastGuestView } from "../games/last-guest/types";
import type { FourRowAction, FourRowView } from "../games/four-row/types";
import type { WordChainAction, WordChainView } from "../games/word-chain/types";
import type { QuizRushAction, QuizRushView } from "../games/quiz-rush/types";
import type { DrawAction, DrawPoint, DrawSettings, DrawView } from "../games/draw/types";
export type Player = {
  id: string;
  name: string;
  avatar: number;
  connected: boolean;
  ready: boolean;
};
export type GameView =
  LastGuestView | FourRowView | WordChainView | QuizRushView | DrawView;
export type RoomView<TGame extends GameView = LastGuestView> = {
  code: string;
  gameId: string;
  hostId: string;
  players: Player[];
  phase: "waiting" | "playing" | "completed";
  createdAt: number;
  game: TGame | null;
  serverTime: number;
  settings?: DrawSettings;
};
export type Reply = { ok: true; code?: string } | { ok: false; error: string };
export type Command =
  | { type: "create"; name: string; avatar: number; gameId: string }
  | { type: "join"; code: string; name: string; avatar: number }
  | { type: "ready"; ready: boolean }
  | { type: "configure"; settings: DrawSettings }
  | { type: "start" | "leave" | "rematch" }
  | {
      type: "game";
      action:
        LastGuestAction | FourRowAction | WordChainAction | QuizRushAction | DrawAction;
    };
export type Envelope = { id: string; command: Command };
export type ServerEvents = {
  "room:state": (room: RoomView | null) => void;
  session: (data: { id: string }) => void;
};
export type ClientEvents = {
  command: (envelope: Envelope, ack: (result: Reply) => void) => void;
  move: (input: { x: number; z: number }) => void;
  draw: (input: DrawPoint) => void;
};
