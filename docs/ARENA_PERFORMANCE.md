# MindBop Arena — Performance & Multiplayer Verification

MindBop Arena is designed as a browser-first authoritative multiplayer FPS. The client renders the 3D world locally with Babylon.js; the server owns gameplay state, validation, scoring and hit registration.

## Performance targets

| Tier | Target | Strategy |
| --- | --- | --- |
| Ultra | 90–144+ FPS on capable desktop GPUs | Reduced hardware scaling, full lighting/effects |
| High | 60 FPS on mid-range laptops | Adaptive hardware scaling, bounded glow and geometry |
| Medium | 45–60 FPS on integrated GPUs | Fewer effects, conservative render scale |
| Low | 30+ FPS on mobile-class hardware | Higher hardware scaling, lower tessellation, fewer props |

No browser game can guarantee a fixed FPS on every device. The quality system is deliberately adaptive so gameplay simulation is not tied to the render rate.

## Netcode

- Server-authoritative movement and combat.
- Client-side movement prediction for the local player.
- Reconciliation toward authoritative snapshots.
- Interpolation for remote players.
- Server-side fire-rate, weapon, ability and team validation.
- Up to 1 second of safe rewind for lag-compensated hits.
- Historical hitboxes sampled continuously on the server.
- Spawn protection after death.
- Reconnect/session support remains owned by the shared MindBop room engine.

## Room scaling

A single Arena room is intentionally limited to 10 players. Scale concurrency horizontally by running many isolated rooms rather than putting hundreds of FPS players into one simulation.

Examples:

- 10 rooms × 10 players = 100 concurrent players
- 100 rooms × 10 players = 1,000 concurrent players
- 500 rooms × 10 players = 5,000 concurrent players

The practical limit depends on CPU, memory, WebSocket bandwidth, network latency and the hosting provider. Measure before increasing limits.

## Verification commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm test:load
```

For load testing against a running server:

```bash
LOAD_ORIGIN=http://localhost:3000 LOAD_GAME=mindbop-arena LOAD_ROOMS=100 LOAD_PLAYERS=10 pnpm test:load
```

Run smaller steps first and watch server CPU, memory, event-loop delay, WebSocket traffic, acknowledgement p95 and error rate.

## Latency test plan

Use browser/network throttling or a development proxy to test:

- 0 ms baseline
- 50 ms round trip
- 100 ms round trip
- 150 ms round trip
- 200 ms round trip
- intermittent packet loss
- reconnect after a temporary disconnect

The expected behavior is that local movement remains responsive, remote movement remains smooth, and server reconciliation corrects accumulated prediction error without large visible teleports.

## Browser/GPU test matrix

Before release, test at minimum:

- Chrome + Windows + integrated GPU
- Chrome + Windows + discrete GPU
- Edge + Windows laptop
- Safari + iPhone/iPad
- Chrome + Android

Record FPS, frame-time p95, memory use, WebSocket latency, packet loss and thermal behavior. Do not treat a single desktop benchmark as proof of mobile performance.
