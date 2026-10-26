# MindBop Arena — Netcode & Performance

## Goals

Arena uses a server-authoritative simulation while keeping local movement responsive. The browser renders at the device refresh rate; the server remains authoritative for movement state, weapon cadence, damage, respawns, capture scoring, and match completion.

## Client prediction

The Arena renderer keeps a predicted local position between server snapshots. Keyboard input is applied immediately to the local camera and the authoritative server position is blended back into the predicted position when snapshots arrive. Large corrections are snapped to avoid runaway prediction.

This is intentionally separate from React state so movement does not cause a component render on every frame.

## Remote interpolation

Remote players are rendered toward their latest authoritative positions using interpolation. This avoids visibly teleporting between network snapshots and keeps the render loop independent from the server update cadence.

## Authoritative shooting

The client sends weapon, yaw, pitch, and an estimated server-time `shotAt`. The server clamps the timestamp to a maximum one-second rewind window, validates the selected weapon, validates the fire cooldown, and performs the hit test against historical player positions. Client-reported damage and hit results are never trusted.

## History buffer

Each Arena player keeps roughly 1.2 seconds of compact position history. Samples are discarded continuously so memory usage stays bounded. A shot is evaluated against an interpolated historical position at the validated shot timestamp.

## Why "no lag" cannot be guaranteed

Internet latency, packet loss, Wi-Fi interference, device thermal throttling, GPU limits, and server distance are outside the game's control. The engineering target is instead:

- immediate local input response through prediction;
- smooth remote movement through interpolation;
- bounded server simulation work;
- server-authoritative combat;
- bounded history and room state;
- graceful correction when the network disagrees with the client;
- scalable rooms rather than one giant 1,000-player simulation.

## Performance rules

- Keep the hot render path outside React.
- Avoid per-frame allocations where practical.
- Reuse Babylon materials and meshes.
- Keep glow, particles, and dynamic lights bounded.
- Use hardware scaling on smaller devices.
- Keep server simulation deterministic and bounded per room.
- Validate all network input at the server boundary.
- Never accept client damage, HP, score, cooldown, or hit claims.

## Scaling target

A single Arena room remains capped at 10 players. Concurrency is achieved by running many isolated rooms. Horizontal scaling should be added at the server layer with a room registry/matchmaker and multiple game processes before attempting thousands of concurrent connections.

## Testing checklist

Before a production release, test two or more real browsers with simulated latency and packet loss, verify prediction/reconciliation, measure server tick p95, inspect client FPS on integrated graphics and mobile-class hardware, and run a multi-room load test. A repository-side code review cannot substitute for those measurements.
