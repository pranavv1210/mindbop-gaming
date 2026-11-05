# StreakKeeper

StreakKeeper is a small, transparent daily heartbeat automation for this repository.

## What it does

- Runs twice daily on a schedule (00:10 and 12:10 India Standard Time).
- Supports a manual run through **Actions → StreakKeeper → Run workflow**.
- Writes at most one entry per India-local calendar date to `streakkeeper/activity.md`.
- Commits the log to `main` using the repository's GitHub Actions token.
- Uses the account's GitHub noreply email so GitHub can associate the commit with the account.
- Skips duplicate runs for a date that already has an entry.

## Important limitations

This is an automated repository heartbeat, not evidence of hands-on engineering work. Keep real learning notes, code changes, reviews, and project work as your meaningful contributions. GitHub controls whether a commit appears on the contribution graph; the author email must be associated with the account and the commit must meet GitHub's contribution rules.

Scheduled Actions can be delayed or skipped. The second daily schedule is a backup attempt, not a guarantee. Check the Actions tab periodically.

## Disable it

Open **Actions → StreakKeeper → ⋯ → Disable workflow**, or remove `.github/workflows/streakkeeper.yml`.
