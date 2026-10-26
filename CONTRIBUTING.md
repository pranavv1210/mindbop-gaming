# Contributing to MindBop

Thanks for wanting to build with us. MindBop is intended to become a community-driven browser gaming platform, and contributions from developers, designers, artists, testers, writers, and players are welcome.

## Before you start

For a small bug fix or documentation change, open a pull request directly when the change is clear.

For a new game, major architecture change, multiplayer protocol change, new dependency with broad impact, or large UI redesign, open an issue or discussion first. Explain the problem, proposed solution, affected areas, and testing plan.

## Development workflow

1. Fork the repository.
2. Create a focused branch from `main`.
3. Install dependencies with `npm ci`.
4. Make the smallest coherent change that solves the problem.
5. Run formatting/lint/type checks and relevant tests.
6. Test multiplayer changes with at least two browser sessions when applicable.
7. Test responsive behavior when the change affects UI.
8. Update documentation when behavior or architecture changes.
9. Open a pull request with a clear description and verification notes.

## Game contributions

New games are especially welcome. A game submission should include:

- Original gameplay and implementation, or clearly documented third-party rights.
- Responsive desktop and mobile behavior appropriate to the game.
- A clear player-count range.
- A game cover and required visual assets.
- Loading, lobby, start, active-game, results, and error states as appropriate.
- Safe server-side validation for multiplayer rules.
- Reconnect and disconnect handling where the game is multiplayer.
- Tests for important game rules and edge cases.
- Documentation explaining the game and its architecture.
- No secrets, private credentials, or production-only configuration committed to the repository.

See `docs/game-publishing.md` for the publishing checklist.

## Code standards

- Prefer strict TypeScript.
- Avoid `any` unless there is a documented reason.
- Keep components and modules focused.
- Prefer shared constants/types over duplicated protocol definitions.
- Keep authoritative multiplayer rules on the server.
- Validate untrusted client input.
- Avoid unnecessary allocations in high-frequency game loops.
- Keep game-specific logic isolated from platform infrastructure.
- Do not introduce dependencies without a clear reason.

## Pull requests

A good pull request should explain:

- What changed.
- Why it changed.
- Which files or systems are affected.
- How it was tested.
- Any known limitations or follow-up work.

Keep PRs reviewable. If a feature is large, split it into logical changes when possible.

## Commit messages

Use short, descriptive commit messages such as:

- `feat: add mafia room flow`
- `fix: preserve player state after reconnect`
- `perf: reduce drawing event allocations`
- `docs: add game publishing guide`
- `chore: update dependencies`

## Review philosophy

Code review is about improving the product, not winning arguments. Review for correctness, security, performance, maintainability, accessibility, player experience, and consistency with the platform architecture.

Thank you for helping make MindBop better. 🎮
