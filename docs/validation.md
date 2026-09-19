# Validation record

Environment: Windows, Node.js 22.17.0, npm 10.9.2, Chromium through Playwright. The application tests use real HTTP sessions, WebSockets, separate browser contexts, and WebGL hotel scenes.

## Final local checks

| Check | Result |
| --- | --- |
| Production build | Passed |
| TypeScript | Passed |
| ESLint | Passed |
| Engine/case tests | 11 passed |
| Browser/API/accessibility suite | 5 tests |
| Full two-browser case | Passed in 1.1 minutes |
| Local Socket.IO exercise | 8 rooms / 16 clients; 0 action errors |
| Local preview | Production server at `http://localhost:3000` |

The preview server is intentionally left running. No public deployment has been performed.

## Coverage

- Room isolation, duplicate names, unsupported games, six-player capacity, ready/start/host permissions, idempotent commands, throttling, host transfer, multiple tabs, reconnect grace, room/session expiry, leave and rematch.
- Server movement: normalized direction only, speed bounds, stale-input stopping, wall collision, no movement during briefing, and retained positions after reconnect.
- Case authority: physical proximity, evidence prerequisites, idempotent shared discovery, undiscovered-secret projection, evidence-gated interviews, valid deductions, locked accusations, collected citations, proposal rejection/stale IDs, two-player consensus, correct and incorrect resolution.
- Hotel connectivity: every clue and suspect is reachable from spawn through the authored collision map.
- Browser flow: two isolated contexts create/join a room; desktop keyboard and mobile touch controls move through all five areas; evidence and notes synchronize; a guest reload retains identity, position and discoveries; the group interviews suspects, connects evidence, submits a supported accusation, sees the authored reveal, and returns to a clean lobby.
- Rendering: Babylon WebGL scene readiness, desktop/mobile screenshots, reduced graphics mode, and no uncaught page errors during the complete case.
- Accessibility/API: axe WCAG A/AA checks on landing, hub, dialog and case reveal; responsive overflow checks at 320, 375, 768, 1024 and 1440 px; foreign origins rejected; HTTP-only session cookie; unconfigured feedback reports unavailable.

Automated axe results are useful regression checks, not a manual accessibility certification. Touch is emulated Chromium, not a physical phone.

## Latest small load exercise

Run against the local production build on September 20, 2026:

| Measurement | Observed |
| --- | --- |
| Rooms | 8 |
| Clients | 16 / 16 connected |
| Accepted actions | 72 |
| Errors | 0 |
| Duration | 2.84 seconds |
| Throughput | 25.33 acknowledged actions/second |
| Median acknowledgement | 4.19 ms |
| p95 acknowledgement | 15.29 ms |
| Maximum acknowledgement | 20.36 ms |

This exercise covered create/join, concurrent rooms, reconnect, server movement and peer synchronization, shared investigation notes, and explicit cleanup. It did not render 16 hotel scenes, sustain a long workload, measure CPU/RSS, or establish capacity. Results are local-loopback measurements and should not be compared with internet latency.

## Remaining limits

- One compact authored case with a fixed solution. No procedural cases, voice chat, combat, or additional playable titles.
- No physical-phone, Safari, Firefox, or low-end GPU verification. Chromium desktop and touch-emulated layouts passed.
- Rooms and progress are in one server process and disappear on restart. No multi-instance routing/state adapter exists.
- No 1,000-user load test, soak, reconnect storm, production proxy/abuse test, or operational monitoring.
- Supabase feedback insertion is unverified because no project credentials were configured. Its unavailable state is verified.
- The Dockerfile includes the public assets but was not built in this environment.

Before setting a public capacity target, use a dedicated staging deployment and increase clients gradually while recording CPU, RSS, event-loop delay, connection success, p95/p99 latency, and error rate. Include rendered clients on representative devices, simultaneous starts, reconnect bursts, long-idle expiry, and server restart behavior.
