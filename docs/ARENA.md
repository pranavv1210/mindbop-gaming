# MindBop Arena

An original 6v6 team arena shooter (same genre/feel as browser arena shooters, with its own maps, heroes, weapons and art).

## Architecture
- Separate socket.io namespace `/arena` with its own 30 Hz tick loop, so shooter load never touches the party games.
- Rooms of up to 12 players. The matchmaker (`server/arena/director.ts`) fills rooms, opens new ones on demand (cap `maxRooms`, default 100) and supports 6-character private rooms.
- Server-authoritative. Movement physics (`src/arena/physics.ts`) is shared and deterministic, so the client predicts and the server confirms; mismatches are reconciled by replaying unacknowledged inputs.
- Lag compensation: shots rewind other players to what the shooter saw (bounded to 10 ticks).
- Binary wire format (`src/arena/codec.ts`): 17-byte input, compact snapshots (about 6.5 KB/s per client at 30 Hz). Cloaked players are not sent to the enemy team.
- Abuse limits: token-bucket rate limits, input queue cap, one socket per player, 15 s reconnect grace.

## Content
Heroes: Striker (dash), Warden (barrier), Ghost (cloak), Medic (heal pulse). Weapons: Pulse, Scatter, Rail, Arc. Maps: Foundry, Atrium, Docklands (mirrored, fairness tested). Team deathmatch, first to 30 kills or 5 minutes.

## Testing
- `npm test` runs codec, physics, map fairness/connectivity, room rules, lag compensation and real-socket tests.
- `npm run test:arena-load -- 120 20` runs 120 real bot clients for 20 s against the real namespace.

## Measured load (one process, bots on the same machine, so pessimistic)
| Bots | Rooms | Tick p50 / p99 / max (ms) | Slow ticks | Per-client |
|---|---|---|---|---|
| 120 | 10 | 3.4 / 6.3 / 9.4 | 0 | 6.6 KB/s, 29.9 snaps/s |
| 300 | 25 | 7.3 / 17.1 / 35.1 | 3 | 6.4 KB/s, 29.1 snaps/s |

The tick budget is 33 ms. One Node process handled 100+ concurrent players with plenty of headroom in this test.

## Limits (honest)
- A player's lag also depends on their own connection and distance to the server; nothing removes real network latency.
- One process = one region. For worldwide players, run one server per region behind a region picker; rooms are independent so this scales horizontally.
- Load numbers come from scripted bots, not human play. Re-run the load script on the real host.
