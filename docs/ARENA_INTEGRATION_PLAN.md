# MindBop Arena integration plan

## Repository audit

- **Frontend:** Next.js App Router, React 19 and strict TypeScript. Game screens live under `src/games`; dynamic rooms use `/play/room/[code]`.
- **3D:** Babylon.js is already loaded lazily by the existing 3D games. Reusing it avoids a second renderer and duplicate WebGL dependencies.
- **Realtime backend:** the custom Node server in `server/index.ts` hosts Next.js and Socket.IO. `Engine` owns sessions, rooms, validation, persistence and projection of private game views.
- **Identity:** anonymous or Supabase-backed guests receive a server session cookie and locally persisted display profile. Room players reference the stable session ID.
- **Rooms:** six-character private codes, invite links, readiness, host transfer, reconnect and room isolation already exist. Arena will extend this system instead of adding `ws` beside Socket.IO.
- **Database:** Supabase is optional. Active rooms can be persisted and completed matches recorded without exposing service credentials to clients.
- **Design system:** Plus Jakarta Sans / DM Sans, violet-led MindBop tokens, accessible modal/button primitives, dark-first game hub and responsive active-game viewport.
- **Deployment:** one always-on Node process is expected by `render.yaml`; WebSocket affinity and horizontal room routing are later-phase concerns.
- **Testing:** Node test runner covers authoritative modules; Playwright covers real multi-context rooms and WebGL.

## Decisions and conflicts

The brief's Vite/Three.js/`ws` suggestions are replaced by the repository's equivalent Next.js/Babylon.js/Socket.IO stack. Adding parallel stacks would increase bundle size, split identity/rooms, and weaken verification. Phase 1 uses the existing JSON command channel and movement input; compact snapshots belong to Phase 2.

## Phased plan

1. **Phase 1:** Arena card and private-room flow; compact test arena; first-person pointer lock; WASD, sprint and jump input boundary; local weapon feedback and target dummy; server-authoritative positions visible in two browsers.
2. **Phase 2:** dedicated 60 Hz Arena simulation, sequenced inputs, prediction/reconciliation, interpolation buffer, compact snapshots, heartbeat/ping and latency simulation.
3. **Phase 3+:** authoritative combat, objective, four configured heroes, cards, content and scaling in the exact order from the master brief.

## Phase 1 acceptance boundary

Phase 1 proves two real browser sessions can join one existing MindBop room, enter one map, move under server validation and see each other. Weapon damage, capture scoring, heroes and matchmaking are intentionally not claimed until their later phases.
