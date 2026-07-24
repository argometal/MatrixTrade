# Current production deploy pointer

**Do not merge old feature branches into local `main`.** Production truth is GitHub `origin/main`.

| Field | Value |
|--------|--------|
| **Tag** | `main0724a` |
| **Commit** | Always `git rev-parse main0724a` after fetch (must match `origin/main`) |
| **Production URL** | https://matrix-trade-theta.vercel.app |
| **Date** | 2026-07-24 |

## Sync local (avoid conflicts / lost work)

```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
# optional pin: git checkout main0724a
```

## What this deploy includes

- PR #61: Runbook sections, inline rename, Reminders-style list
- PR #33: Network Mechanics + Apply + Library (removed Request layer)
- PR #31: ARGUS Network Mechanics orientation (superseded UI by #33)
- PR #16: Runbooks redesign, scoped drill-down, Timeline/Chronicle UX
- PR #14 / #15: Topics/Events metrics, vocabulary

## Stale PRs (closed)

PRs #1–#4, #9, #10 were obsolete vs current `main`. Do not reopen or merge them.
