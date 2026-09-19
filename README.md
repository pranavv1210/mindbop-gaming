# MindBop — The Last Guest

A cooperative browser murder mystery for 2–6 players. This milestone is one compact, fully authored case in a procedural 3D hotel.

## Play locally

Node.js 22.17+ and npm:

```sh
npm ci
npm run dev
```

Open **http://localhost:3000/play**. Create a room and invite a friend with its code. To test alone, join from an incognito window or another browser: ordinary tabs share one guest identity. Both players must ready up; the host starts the case and begins the briefing.

Move with WASD, arrow keys, or the touch direction pad. Walk close to gold evidence markers or violet suspects, then use the Inspect panel (E inspects the nearest object). Discoveries, interviews, deductions, and team notes are shared. Connect evidence, complete the follow-up interviews, and propose a culprit, method, motive, and at least three supporting clues. Every connected investigator must agree; at least two must be connected.

**No backend credentials or external assets are required for gameplay.** For phones on the same LAN, set `APP_ORIGIN=http://YOUR_LAN_IP:3000` in `.env.local`, restart, and use that exact URL on every device. WebGL support is required for the hotel view. Physical-device performance is not yet verified.

## Implemented

- Five connected areas: lobby, hallway, study, guest room, and dining room. Original procedural furniture, props, suspects, and player avatars.
- Real private rooms, ready checks, host transfer, membership isolation, reconnect grace, leave, expiry, and replay.
- Server-simulated movement with wall/furniture collisions, normalized direction inputs, stale-input stopping, and interpolated peer avatars.
- Nine clues, three authored suspects, evidence-gated interviews, two deductions, shared notes, unanimous accusation, and truthful success/failure resolution.
- Discovered evidence only is projected to clients. The authored solution and undiscovered clue text stay in server modules until resolution.
- Lazy-loaded Babylon renderer with graphics settings, reduced-resolution adaptation, and explicit load/context-loss errors.
- Actual completed-case history and guest preferences stored in the current browser.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:load
```

Playwright uses separate desktop and touch-emulated Chromium contexts, drives real movement controls through all five areas, collects evidence, reloads a guest, exchanges notes, builds deductions, agrees on an accusation, checks the reveal, and returns to the lobby. It does not inject gameplay state. Screenshots/traces are ignored local artifacts.

The load script exercises 8 rooms / 16 Socket.IO clients by default: room lifecycle, reconnect, synchronized movement, and shared notes. It does **not** render graphics or prove large-scale capacity. `LOAD_ORIGIN` and `LOAD_ROOMS` (1–20) configure a server you own.

See [the implementation audit](docs/last-guest-milestone.md) and [validation notes](docs/validation.md).

## Architecture

| Location | Responsibility |
| --- | --- |
| `src/games/last-guest/` | Babylon hotel, keyboard/touch controls, evidence UI, shared geometry/types |
| `server/games/last-guest/` | Authored secrets, proximity checks, prerequisites, progression, consensus, resolution |
| `server/engine.ts` | Cookie-bound membership, room lifecycle, validation, permissions, rate limits |
| `server/index.ts` | HTTP sessions/feedback, Socket.IO, 20 Hz simulation / up to 10 Hz snapshots |
| `src/components/game-provider.tsx` | Guest session and room transport |
| `tests/` | Domain, lifecycle, browser, accessibility, and origin checks |

The browser sends movement directions, never trusted positions. The server normalizes and simulates inputs, rejects distant interactions, and supplies authoritative snapshots. Action UUIDs deduplicate retries. Same-site HTTP-only cookies bind socket identities; browser storage never authenticates a player.

Disconnects retain membership and case progress for two minutes. Hosting transfers to a connected member. A disconnect alone never submits an accusation. Late joins are rejected once a case starts. Empty rooms disappear; inactive rooms expire after an hour. All server state is currently in memory.

## Exact limits and configuration

- One fixed solution; replay resets the same case. No procedural mysteries, voice chat, combat, or additional games.
- Original geometric art is an early playable environment, not a finished cinematic asset set. No external asset acquisition blocks this milestone.
- Server restarts lose rooms, identities, and investigation progress. Durable saves, shared room routing, multi-instance deployment, and production observability are not implemented.
- No promise of lag-free play on every device, and no 1,000-user capacity claim. Test physical target devices and a dedicated staging deployment before setting capacity targets.
- Feedback alone requires `SUPABASE_URL`, server-only `SUPABASE_SERVICE_ROLE_KEY`, and `supabase/migrations/001_feedback.sql`. Without these, feedback sending remains disabled. A real Supabase project has not been verified.

## Deployment after local review

Run `npm run build` then `npm start` on one always-on Node/container host with WebSocket support. Set `APP_ORIGIN` to the exact final HTTPS origin; `PORT` defaults to 3000. A Dockerfile includes public art assets; the container build is not verified here. Health endpoint: `/api/health`.

Do not scale to multiple processes until room routing/state and an appropriate Socket.IO adapter are implemented. Reverse-proxy-aware rate limiting also needs configuration before broad public use. No deployment is performed automatically. Privacy and terms pages remain preview drafts.
