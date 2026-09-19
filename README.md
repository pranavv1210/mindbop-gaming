# MindBop

Think fast. Play wild. A guest-first browser party game platform with a real, server-authoritative multiplayer loop.

## Run locally

Requires Node.js 22.17+ and npm.

```sh
npm ci
npm run dev
```

Open **http://localhost:3000**. No environment variables are required for gameplay.

To try multiplayer on one computer, create a room in a normal browser window, then open an **incognito window** (or a different browser) and join using its code. Tabs in the same browser share an identity and are not separate players.

For a phone on the same network, set `APP_ORIGIN=http://YOUR_LAN_IP:3000` in `.env.local`, restart, and open that exact address on **every** device. Allow the port through your firewall if needed. Copying links needs HTTPS or localhost; room codes work when clipboard access is unavailable.

## What works

- Responsive landing page, original SVG/CSS game illustrations, local fonts, accessible mobile navigation, and reduced-motion support.
- Guest nickname/avatar preferences and actual completed-game history stored in the browser.
- Game hub with search, categories, sorting, empty states, and create/join flows.
- Real Socket.IO rooms, private invite codes, player presence, ready checks, host settings, leave/transfer, reconnects, and expiry.
- **Brainwave:** 2–8 players; 3, 5, or 8 rounds; 20 seconds per question; 6-second answer reveals; 100 points for each correct answer. Ties share the win. Results and rematches work.
- Three additional games are explicitly marked **Coming soon**; they cannot create rooms.
- Validated, rate-limited feedback API with optional Supabase storage. Without configuration, the form honestly disables sending.
- Privacy and terms pages clearly identify their draft/preview status. They are not final legal policies.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js and Socket.IO on one local server |
| `npm run build` | Production Next.js build |
| `npm start` | Serve a completed production build |
| `npm run typecheck` | TypeScript checks across app, server, and tests |
| `npm run lint` | ESLint |
| `npm test` | Room engine and game module tests |
| `npm run test:e2e` | Chromium UI and real two-session multiplayer tests |
| `npm run test:load` | Small, actual Socket.IO workload against localhost |

Install the browser once with `npx playwright install chromium`. E2E tests can start the dev server or reuse an existing localhost server. Screenshots and failed-test traces are local artifacts, excluded from Git.

## Architecture

```text
src/app/                 Next.js pages and guest game routes
src/components/          Shared UI, socket provider, lobby, gameplay, results
src/lib/                 Public metadata, wire types, local preferences
server/index.ts          HTTP endpoints, session cookie, Socket.IO transport
server/engine.ts         Validated room lifecycle, presence, identity, permissions
server/games/            Opaque game-module contract, registry, Brainwave rules
supabase/migrations/     Optional persistent feedback schema
tests/                   Engine and multi-browser integration tests
scripts/load.ts          Small reproducible multiplayer load exercise
```

The custom Node server lets Next.js and Socket.IO share one origin and port. Keep it as a long-running process, not a static export or short-lived serverless function. The transport does not own scoring. The room engine treats game state as opaque; modules own rules, transitions, deadlines, scoring, and per-player projection. Public game metadata is separate from the server-only question bank.

### Identity, privacy, and lifecycle

- The server creates a random session ID and a 256-bit session token. The token travels only in a same-site, HTTP-only cookie (secure with an HTTPS production origin). Local storage is preferences/history, never authentication.
- Socket membership follows the cookie, not a client-supplied player ID. Duplicate names are valid; simultaneous tabs share one member.
- Room mutations are validated server-side and rate-limited. UUID action IDs deduplicate retries; the client retries an acknowledgement timeout once with the same ID.
- Waiting rooms accept joins. A game starts only when 2–8 connected players are ready. Settings changes reset readiness. Joining during play/results is rejected. Rematches return everyone to waiting.
- Disconnects preserve membership and game answers for two minutes. Hosting passes immediately to the first connected player and does not automatically transfer back. Reconnecting players keep their ID, answer, and score. Expired disconnected players are removed.
- Deadlines advance on the server; disconnected players cannot stall play. Correct answers and explanations are omitted until reveal. A player sees only their own submitted answer.
- Empty rooms are removed. Rooms expire after an hour without accepted room activity; unused disconnected sessions expire after 24 hours. Explicit leaving removes the player's score from the current room.
- Room state is sent only to members, and only when its meaningful content changes. API logs do not include cookies, message bodies, or game secrets.

## Optional feedback storage

Copy `.env.example` to `.env.local`. Apply `supabase/migrations/001_feedback.sql` to your Supabase project, then set:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_KEY
```

Restart the server. The API writes through the service role; the table has RLS and no anonymous read/write policies. Never prefix this key with `NEXT_PUBLIC_` or commit `.env.local`. The form shows success only after Supabase acknowledges insertion. The real database integration requires credentials and has not been verified against a provisioned project here.

Other settings: `PORT` defaults to `3000`; `APP_ORIGIN` defaults to `http://localhost:PORT` and must match the exact browser origin. POST endpoints enforce this origin. Session/feedback limits use the direct socket address; behind a reverse proxy this is conservative and may group users under the proxy IP. Configure trusted-proxy-aware limiting before a broad public launch.

## Deployment after local review

No deployment is performed by these files. Use a **single always-on Node/container instance with WebSocket support**, set `APP_ORIGIN` to its final HTTPS URL, run `npm ci && npm run build`, then `npm start`. A Dockerfile is included as an alternative; it has not been built in this environment. `/api/health` is the health-check endpoint.

Rooms and sessions currently live in process memory, so a restart loses them. Do not add multiple instances without shared room routing/state and an appropriate Socket.IO adapter. Persistent game history, accounts, cross-device preferences, additional playable games, observability infrastructure, and horizontal scaling are future work.

## Validation and capacity

See [docs/validation.md](docs/validation.md) for actual runs and limits. This is an initial playable product, **not a demonstrated 1,000–10,000-player service**. The small load script creates multiple rooms, reconnects a player, completes games, measures acknowledgements, and leaves rooms. `LOAD_ORIGIN` and `LOAD_ROOMS` configure it (1–20 rooms; keep the default 8 for a first check). Run only against an instance you own. For larger tests, use a dedicated staging host, distributed clients, process CPU/RSS and event-loop instrumentation, gradual ramp-up, burst and reconnect storms, and sustained idle/expiry checks. Measure errors and tail latency before increasing load.
