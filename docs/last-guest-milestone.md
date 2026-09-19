# The Last Guest: implementation audit and milestone

## Starting point

The repository had working guest sessions, private Socket.IO rooms, readiness, reconnect/host transfer, and a trivia game. It had **no playable Last Guest systems**: no 3D renderer/hotel, movement, avatars, case data, evidence, suspect interviews, deductions, accusation, or case resolution. The previous trivia tests and load results did not demonstrate a mystery game.

## Complete milestone implemented

| System | Delivered | Remaining limitation |
| --- | --- | --- |
| Hotel | Five connected, furnished Babylon areas with original props and interactive markers | Procedural geometric art; no commissioned characters/audio |
| Controls | Keyboard, arrows, touch pad; server collisions; graphics settings and errors | Fixed cutaway camera; physical phones still need profiling |
| Rooms | Real create/join, private codes, 2–6 participants, ready/start, host transfer, leave/replay | No late join during an active case |
| Synchronization | 20 Hz server simulation, 10 Hz snapshots, interpolated avatars, shared discoveries/notes | In-process server; no horizontal scaling or durable sessions |
| Evidence | Nine authored clues, proximity and prerequisite checks, idempotent collection | Fixed case, no inventory trading |
| Progression | Evidence-dependent suspect topics, two supported deductions, shared objectives | Compact investigation, not a validated 20–30 minute episode |
| Resolution | Killer/method/motive plus cited evidence; unanimous connected group vote; success/failure, explanation, timeline and missed clues | Fixed solution; two connected investigators required |

The landing page received only corrections to obsolete trivia content and the entry point. No extra static game cards were added. The obsolete Brainwave runtime was removed.

## Authority boundaries

- Shared `world.ts` contains public geometry; it does not contain evidence text or a solution.
- Secret case content lives under `server/games/last-guest/`. Clients receive discoveries and unlocked topic labels, not the full story.
- Movement requests are bounded direction vectors tied to the socket's session. The server simulates elapsed time, normalizes diagonal speed, substeps collisions, and expires stale input.
- Inspections and interviews validate distance, line of reach, target and prerequisites. Connections validate actual collected evidence.
- Accusations require five key clues, two deductions, three follow-up interviews, and at least three distinct collected citations.
- Proposal IDs prevent stale votes. Disagreement reopens discussion. Disconnects never automatically finalize the case.
- Unsupported theories produce a failed case with the correct explanation; the UI does not fabricate a successful solve.

## Blockers and unfinished work

There is no missing backend credential or asset blocker for this local gameplay milestone. The hotel uses repository-owned procedural geometry and an original SVG cover.

Optional feedback persistence remains blocked on a configured Supabase project, both server environment variables, and its migration. This does not block rooms or investigation.

Durable saves, production multi-instance routing, voice, a richer art/audio set, physical-device performance, and large concurrent-user validation remain unfinished. These are explicitly excluded from claims of completion.
