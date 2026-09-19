import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { GameModule } from "../module";
import type {
  Evidence,
  Interview,
  LastGuestView,
  Theory,
} from "../../../src/games/last-guest/types";
import {
  hotspots,
  movePoint,
  reachable,
  spawnPoint,
  SPEED,
  type Point,
} from "../../../src/games/last-guest/world";
import { evidence, dialogues, deductions, solution } from "./case";
export type CaseState = {
  runId: string;
  phase: LastGuestView["phase"];
  positions: Record<string, Point>;
  inputs: Record<string, { x: number; z: number; at: number }>;
  lastTick: number;
  evidence: Evidence[];
  interviews: Interview[];
  connections: string[];
  proposal: LastGuestView["proposal"];
  notes: LastGuestView["notes"];
  result: LastGuestView["result"];
  activePlayers: string[];
};
const theorySchema = z.object({
  suspect: z.enum(["mara", "eli", "june"]),
  method: z.enum(["letter-opener", "poison", "fall"]),
  motive: z.enum(["embezzlement", "inheritance", "revenge"]),
  evidence: z
    .array(z.string().max(30))
    .min(3)
    .max(9)
    .refine((ids) => new Set(ids).size === ids.length),
});
export const caseActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("begin") }),
  z.object({ type: z.literal("inspect"), target: z.string().max(30) }),
  z.object({
    type: z.literal("interview"),
    target: z.string().max(30),
    topic: z.string().max(30),
  }),
  z.object({
    type: z.literal("connect"),
    first: z.string().max(30),
    second: z.string().max(30),
  }),
  z.object({ type: z.literal("propose"), theory: theorySchema }),
  z.object({
    type: z.literal("vote"),
    proposalId: z.string().uuid(),
    agree: z.boolean(),
  }),
  z.object({
    type: z.literal("note"),
    text: z.string().trim().min(1).max(180),
  }),
]);
const has = (s: CaseState, id: string) => s.evidence.some((e) => e.id === id);
export function canAccuse(s: CaseState) {
  return (
    ["body", "ledger", "clock", "breaker", "key"].every((id) => has(s, id)) &&
    s.connections.length === deductions.length &&
    ["mara:accounts", "june:witness", "eli:timing"].every((id) =>
      s.interviews.some((i) => i.id === id),
    )
  );
}
function near(s: CaseState, id: string, target: string) {
  const spot = hotspots.find((h) => h.id === target);
  if (!spot || !s.positions[id] || !reachable(s.positions[id], spot))
    throw new Error("Walk closer to this object or person first.");
  return spot;
}
function finish(s: CaseState, theory: Theory) {
  const supported = ["body", "ledger", "key"].every((id) =>
    theory.evidence.includes(id),
  );
  const solved =
    theory.suspect === "mara" &&
    theory.method === "letter-opener" &&
    theory.motive === "embezzlement" &&
    supported;
  s.result = {
    solved,
    ...solution,
    missed: evidence.filter((e) => !has(s, e.id)).map((e) => e.name),
    submitted: theory,
  };
  s.phase = "reveal";
  s.inputs = {};
  s.proposal = null;
}
export const lastGuest: GameModule<CaseState> = {
  id: "last-guest",
  create(players, now) {
    return {
      runId: randomUUID(),
      phase: "briefing",
      positions: Object.fromEntries(
        players.map((id, i) => [id, spawnPoint(i)]),
      ),
      inputs: {},
      lastTick: now,
      evidence: [],
      interviews: [],
      connections: [],
      proposal: null,
      notes: [],
      result: null,
      activePlayers: players,
    };
  },
  input(s, id, x, z, now) {
    if (s.phase === "briefing" || s.phase === "reveal" || !s.positions[id])
      return;
    const length = Math.max(1, Math.hypot(x, z));
    s.inputs[id] = { x: x / length, z: z / length, at: now };
  },
  act(s, id, raw, now) {
    const parsed = caseActionSchema.safeParse(raw);
    if (!parsed.success)
      throw new Error("That investigation action is invalid.");
    const a = parsed.data;
    if (s.phase === "reveal")
      throw new Error(
        "The case is closed. Return to the lobby for another investigation.",
      );
    if (a.type === "begin") {
      if (s.phase !== "briefing")
        throw new Error("The investigation has already begun.");
      s.phase = "investigation";
      return;
    }
    if (s.phase === "briefing")
      throw new Error("Read the briefing and begin the investigation first.");
    if (a.type === "inspect") {
      near(s, id, a.target);
      const clue = evidence.find((e) => e.id === a.target);
      if (!clue)
        throw new Error("Question this person using an interview topic.");
      if (has(s, clue.id)) return;
      if (!clue.requires.every((required) => has(s, required)))
        throw new Error(
          `First inspect ${evidence.find((e) => e.id === clue.requires.find((r) => !has(s, r)))?.name ?? "the related evidence"}.`,
        );
      s.evidence.push({
        id: clue.id,
        name: clue.name,
        description: clue.description,
        location: clue.location,
        type: clue.type,
        discoveredBy: id,
        discoveredAt: now,
      });
    }
    if (a.type === "interview") {
      near(s, id, a.target);
      const topic = dialogues[a.target]?.find((t) => t.id === a.topic);
      if (!topic || !topic.requires.every((required) => has(s, required)))
        throw new Error(
          "Find the related evidence before asking this question.",
        );
      const key = `${a.target}:${topic.id}`;
      if (!s.interviews.some((i) => i.id === key))
        s.interviews.push({
          id: key,
          suspect: a.target,
          topic: topic.label,
          text: topic.text,
          by: id,
        });
    }
    if (a.type === "connect") {
      if (!has(s, a.first) || !has(s, a.second))
        throw new Error(
          "Both clues must be discovered before connecting them.",
        );
      const deduction = deductions.find(
        (d) =>
          d.pair.includes(a.first) &&
          d.pair.includes(a.second) &&
          a.first !== a.second,
      );
      if (!deduction)
        throw new Error(
          "Those clues do not establish a supported deduction. Compare access with motive, or the two time records.",
        );
      if (!s.connections.includes(deduction.id))
        s.connections.push(deduction.id);
    }
    if (a.type === "note") {
      s.notes.push({ id: randomUUID(), by: id, text: a.text });
      if (s.notes.length > 30) s.notes.shift();
    }
    if (a.type === "propose") {
      if (!canAccuse(s))
        throw new Error(
          "Complete the key evidence, interviews, and deductions first.",
        );
      if (!a.theory.evidence.every((e) => has(s, e)))
        throw new Error("You can only cite evidence your group has collected.");
      if (s.proposal)
        throw new Error(
          "A proposal is already being reviewed. Vote to accept or reopen it.",
        );
      if (s.activePlayers.length < 2)
        throw new Error(
          "At least two investigators must be connected to submit a case.",
        );
      s.proposal = { id: randomUUID(), by: id, theory: a.theory, votes: [id] };
    }
    if (a.type === "vote") {
      if (!s.proposal || s.proposal.id !== a.proposalId)
        throw new Error(
          "That proposal has changed. Review the current theory.",
        );
      if (!a.agree) {
        s.proposal = null;
        return;
      }
      if (!s.proposal.votes.includes(id)) s.proposal.votes.push(id);
      if (
        s.activePlayers.length >= 2 &&
        s.activePlayers.every((p) => s.proposal!.votes.includes(p))
      )
        finish(s, s.proposal.theory);
    }
    if (!s.result && canAccuse(s)) s.phase = "deduction";
  },
  tick(s, players, now) {
    s.activePlayers = players;
    const dt = Math.max(0, Math.min(0.1, (now - s.lastTick) / 1000));
    s.lastTick = now;
    for (const [id, p] of Object.entries(s.positions)) {
      const input = s.inputs[id];
      if (
        !players.includes(id) ||
        !input ||
        now - input.at > 250 ||
        s.phase === "briefing" ||
        s.phase === "reveal"
      )
        continue;
      const next = movePoint(p, input.x * SPEED * dt, input.z * SPEED * dt);
      s.positions[id] = { x: +next.x.toFixed(3), z: +next.z.toFixed(3) };
    }
    return null;
  },
  finished: (s) => s.phase === "reveal",
  project(s) {
    const objective =
      s.phase === "briefing"
        ? "Read the case briefing with your group."
        : !has(s, "body")
          ? "Find the study. Examine the scene before drawing conclusions."
          : !["ledger", "clock", "breaker", "key"].every((e) => has(s, e))
            ? "Search the hotel for the account ledger, key record, and two time records."
            : s.connections.length < 2
              ? "Connect evidence on the board: access with motive, and the two time records."
              : !canAccuse(s)
                ? "Question Mara about the accounts, June about her sighting, and Eli about the timing."
                : "Compare your findings and agree on a supported accusation.";
    return {
      kind: "last-guest",
      runId: s.runId,
      phase: s.phase,
      positions: structuredClone(s.positions),
      evidence: structuredClone(s.evidence),
      interviews: structuredClone(s.interviews),
      connections: deductions
        .filter((d) => s.connections.includes(d.id))
        .map(({ id, name, description }) => ({ id, name, description })),
      readyToAccuse: canAccuse(s),
      objective,
      topics: Object.fromEntries(
        Object.entries(dialogues).map(([id, topics]) => [
          id,
          topics
            .filter((t) => t.requires.every((e) => has(s, e)))
            .map((t) => ({
              id: t.id,
              label: t.label,
              done: s.interviews.some((i) => i.id === `${id}:${t.id}`),
            })),
        ]),
      ),
      proposal: structuredClone(s.proposal),
      notes: structuredClone(s.notes),
      result: structuredClone(s.result),
    };
  },
};
