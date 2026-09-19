import type { Point } from "./world";
export type Evidence = {
  id: string;
  name: string;
  description: string;
  location: string;
  type: string;
  discoveredBy: string;
  discoveredAt: number;
};
export type Interview = {
  id: string;
  suspect: string;
  topic: string;
  text: string;
  by: string;
};
export type Theory = {
  suspect: string;
  method: string;
  motive: string;
  evidence: string[];
};
export type LastGuestAction =
  | { type: "begin" }
  | { type: "inspect"; target: string }
  | { type: "interview"; target: string; topic: string }
  | { type: "connect"; first: string; second: string }
  | { type: "propose"; theory: Theory }
  | { type: "vote"; proposalId: string; agree: boolean }
  | { type: "note"; text: string };
export type LastGuestView = {
  kind: "last-guest";
  runId: string;
  phase: "briefing" | "investigation" | "deduction" | "reveal";
  positions: Record<string, Point>;
  evidence: Evidence[];
  interviews: Interview[];
  connections: { id: string; name: string; description: string }[];
  readyToAccuse: boolean;
  objective: string;
  topics: Record<string, { id: string; label: string; done: boolean }[]>;
  proposal: { id: string; by: string; theory: Theory; votes: string[] } | null;
  notes: { id: string; by: string; text: string }[];
  result: {
    solved: boolean;
    suspect: string;
    method: string;
    motive: string;
    explanation: string;
    timeline: string[];
    missed: string[];
    submitted: Theory;
  } | null;
};
export const suspects = [
  { id: "mara", name: "Mara Vale", role: "Hotel manager" },
  { id: "eli", name: "Eli Ward", role: "Electrician" },
  { id: "june", name: "June Ash", role: "Visiting journalist" },
];
export const methods = [
  { id: "letter-opener", name: "The study’s brass letter opener" },
  { id: "poison", name: "Poison in the dinner glass" },
  { id: "fall", name: "A staged fall during the blackout" },
];
export const motives = [
  { id: "embezzlement", name: "Conceal stolen hotel funds" },
  { id: "inheritance", name: "Take ownership of the hotel" },
  { id: "revenge", name: "Revenge for an unpublished story" },
];
