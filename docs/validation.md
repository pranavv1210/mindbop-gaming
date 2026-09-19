# Validation record

Environment: Windows, Node.js 22.17.0, npm 10.9.2, Chromium installed through Playwright. Real browser sessions and Socket.IO connections are used; no fake players or simulated success states are included in the application.

## Final local checks

| Check | Result |
| --- | --- |
| Production build | Passed |
| TypeScript | Passed |
| ESLint | Passed |
| Engine/module tests | 11 passed |
| Browser/API/accessibility suite | 5 passed against the production server |
| Local preview | Production server on `http://localhost:3000` |

The preview server is intentionally left running for local review. No public deployment has been performed.

## Automated coverage

- 11 engine/module tests: membership and room isolation, host permissions, ready checks, setting changes, duplicate actions, stale/invalid answers, private state projection, server deadlines, complete scoring/reveal/results/rematch loop, reconnects, multi-tab identity, host transfer when an entirely offline room recovers, full rooms, cleanup, and command throttling.
- Browser flow: landing navigation and mobile menu; saved guest preferences; game search, category filters, empty state; invalid-room feedback; dialog dismissal; actual two-browser multiplayer, refresh/reconnect, all rounds, results, rematch, and host transfer.
- Responsive checks: document overflow at 320, 375, 768, 1024, and 1440 px. Desktop and mobile lobby, gameplay, and results screenshots were captured and reviewed.
- API checks: foreign-origin session creation is rejected, session cookies are HTTP-only, and unconfigured feedback returns unavailable rather than success.
- Automated accessibility: axe checks WCAG 2 A/AA and 2.1 AA rules on the landing page, hub, and create-room dialog. This is not a complete manual accessibility certification.

## Small development load exercise

An actual run of `npm run test:load` against localhost in development mode, while browser validation also used the server:

| Measurement | Observed |
| --- | --- |
| Rooms created by load script | 8 |
| Load client connections | 16 / 16 succeeded |
| Accepted actions | 104 |
| Action errors | 0 |
| Elapsed time | 19.37 seconds |
| Average action throughput | 5.37 actions/second |
| Median acknowledgement | 36.69 ms |
| p95 acknowledgement | 84.72 ms |
| Maximum acknowledgement | 106.28 ms |

The run created/joined rooms, reconnected a player, completed three-round games concurrently, and explicitly left the rooms. One separate browser-test room remained at the health check, as expected because that browser test was still active. This is a small functional concurrency check on one development computer, not a capacity benchmark or internet-latency measurement. CPU/RSS were not instrumented for that run. Timed cleanup is separately tested with the engine's controlled clock.

## Remaining limits

- No physical-phone, Safari, or Firefox verification yet; mobile Chromium viewport checks passed.
- No configured Supabase project was available. The unavailable feedback path was verified; live database insertion has not been verified.
- Docker configuration is supplied but has not been built here.
- No 1,000–10,000-player load test, sustained soak test, proxy-aware public abuse testing, or cross-instance room coordination has been performed.
- Final legal policies and operational monitoring are still required for a broad public launch.

## Next capacity test

Use a dedicated single-instance staging deployment and match its exact HTTPS origin. Increase clients gradually; record server CPU, RSS, event-loop delay, connection success, p95/p99 action latency, and errors. Include full games, simultaneous room starts, connection-loss bursts, server restarts, long-idle rooms, and room cleanup. Larger loads need distributed load generators and an intentional rate-limit configuration. Add shared routing/state only after a measured need, then repeat isolation and reconnect tests across nodes.
