# Current production deploy pointer

**Do not merge old feature branches into local `main`.** Production truth is GitHub `origin/main`.

| Field | Value |
|--------|--------|
| **Tag** | `main0722a` |
| **Commit** | Always `git rev-parse main0722a` after fetch (must match `origin/main`) |
| **Production URL** | https://matrix-trade-theta.vercel.app |
| **Date** | 2026-07-22 |

## Sync local (avoid conflicts / lost work)

```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
# optional pin: git checkout main0722a
```

## What this deploy includes

- PR #31: ARGUS Network Mechanics + Request (AI-guided context hierarchy)
- PR #16: Runbooks redesign, scoped drill-down, Timeline/Chronicle UX, portable archive
- PR #14 / #15: Topics/Events metrics, vocabulary (Topic / Tag / Alias / Signal)

## Stale PRs (closed)

PRs #1–#4, #9, #10 were obsolete vs current `main`. Do not reopen or merge them.
