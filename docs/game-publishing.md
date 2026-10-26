# Game Publishing Guide

MindBop is intended to welcome developers who want to build original browser games for a shared multiplayer platform.

## Before building

Open an issue or discussion for substantial new games or architectural changes. Include:

- Game concept
- Target player count
- Solo/multiplayer model
- Expected session length
- Client rendering requirements
- Server-authoritative rules
- Persistence requirements
- Asset sources and licenses
- Expected mobile support
- Performance risks

## Game requirements

A production candidate should have:

- A clear game loop.
- A lobby/start flow where appropriate.
- Robust room lifecycle handling.
- Server validation for multiplayer rules.
- Reconnect/disconnect behavior.
- A responsive UI.
- Loading and error states.
- A game cover and useful metadata.
- Tests for scoring, win conditions, timers, and important edge cases.
- No embedded secrets.
- Documented third-party assets.

## Originality

Do not copy another game's proprietary code, artwork, characters, maps, UI, text, sounds, branding, or other protected content. Genre and mechanic inspiration are fine; copying protected expression is not.

Every third-party asset must have a compatible license and attribution record where required.

## Integration

Games should integrate with the platform's room/session model instead of creating an unrelated authentication or multiplayer system unless there is a strong architectural reason.

Keep game-specific rules isolated. Shared platform code should remain reusable by other games.

## Verification checklist

Before requesting review:

- [ ] TypeScript/type checks pass.
- [ ] Lint passes.
- [ ] Unit tests pass.
- [ ] Relevant E2E tests pass.
- [ ] Two or more browser sessions have been tested for multiplayer games.
- [ ] Reconnect/disconnect paths have been tested.
- [ ] Mobile viewport has been tested.
- [ ] Desktop viewport has been tested.
- [ ] No secrets are committed.
- [ ] Asset licenses are documented.
- [ ] README/game documentation is updated.
- [ ] Performance has been measured on a representative device.

## Review

Maintainers may request changes to gameplay, architecture, security, performance, accessibility, assets, or documentation before a game is included in the public catalog.

Acceptance into the repository does not guarantee permanent inclusion in the public game catalog.
