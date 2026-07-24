# Current production deploy pointer

**Do not merge old feature branches into local `main`.** Production truth is GitHub `origin/main`.

| Field | Value |
|--------|--------|
| **Tag** | `main0724b` |
| **Commit** | Always `git rev-parse main0724b` after fetch (must match `origin/main`) |
| **Production URL** | https://matrix-trade-theta.vercel.app |
| **Date** | 2026-07-24 |

## Sync local (avoid conflicts / lost work)

```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
# optional pin: git checkout main0724b
```

## What this deploy includes

- PR #60 / #59: Argusforge evidence recurrence engine + typed modular graph controls
- PR #61: Argus Runbook sections, inline rename, Reminders-style list
- Argusforge on `main` through navigation panel fix (`ff257ab`) and graph prototype
- PR #33: Network Mechanics + Apply + Library (removed Request layer)
- PR #31: ARGUS Network Mechanics orientation (superseded UI by #33)
- PR #16: Runbooks redesign, scoped drill-down, Timeline/Chronicle UX
- PR #14 / #15: Topics/Events metrics, vocabulary

## Stale PRs (closed)

PRs #1–#4, #9, #10 were obsolete vs current `main`. Do not reopen or merge them.
PR #56 (shell five-controls) superseded by `ff257ab` on `main` — do not merge.
