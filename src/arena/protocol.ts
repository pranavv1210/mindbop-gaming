import type { HeroId, Phase, TeamIndex } from "./config";
import type { MapId } from "./maps";

export type JoinRequest = {
  name: string;
  hero: HeroId;
  mode: "quick" | "create" | "code";
  code?: string;
};

export type Welcome = {
  room: string;
  slot: number;
  gen: number;
  team: TeamIndex;
  mapId: MapId;
  phase: Phase;
  tick: number;
  endsInMs: number;
  isPrivate: boolean;
  killLimit: number;
};

export type JoinReply = ({ ok: true } & Welcome) | { ok: false; error: string };

export type RosterPlayer = {
  slot: number; gen: number; name: string; team: TeamIndex; hero: HeroId;
  kills: number; deaths: number; score: number; connected: boolean;
};
export type RosterEvent = { players: RosterPlayer[]; scores: [number, number] };
export type PhaseEvent = { phase: Phase; mapId: MapId; winner: 0 | 1 | 2 | null; endsInMs: number };
export type FeedEvent = { k: number; kg: number; v: number; vg: number; w: number; h: boolean };
export type HitEvent = { v: number; d: number; h: boolean; k: boolean };
export type HurtEvent = { x: number; z: number; d: number };

export type ArenaServerEvents = {
  welcome: (w: Welcome) => void;
  snap: (data: ArrayBuffer | Uint8Array) => void;
  roster: (r: RosterEvent) => void;
  phase: (p: PhaseEvent) => void;
  feed: (f: FeedEvent) => void;
  hit: (h: HitEvent) => void;
  hurt: (h: HurtEvent) => void;
  kicked: (k: { reason: string }) => void;
};

export type ArenaClientEvents = {
  join: (req: JoinRequest, ack: (reply: JoinReply) => void) => void;
  cmd: (data: ArrayBuffer | Uint8Array) => void;
  hero: (req: { hero: HeroId }) => void;
  leave: () => void;
  ping: (ack: () => void) => void;
};
