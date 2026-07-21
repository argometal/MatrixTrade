# Current production deploy pointer

**Do not merge old feature branches into local `main`.** Production truth is GitHub `origin/main`.

| Field | Value |
|--------|--------|
| **Tag** | `main0721e` |
| **Commit** | Always `git rev-parse main0721e` after fetch (must match `origin/main`) |
| **Production URL** | https://matrix-trade-theta.vercel.app |
| **Date** | 2026-07-21 |

## Sync local (avoid conflicts / lost work)

```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
# optional pin: git checkout main0721e
```

## What this deploy includes

- PR #16: Runbooks redesign (org library, linked Project/Topic/Event tabs, per-entity progress), scoped drill-down, Timeline/Chronicle UX, portable archive, inbox compact header
- PR #14: Topics/Events metrics homologation, neighborhood, portfolio intensity
- PR #15: Vocabulary (Topic / Tag / Alias / Signal), mobile Topics & Events detail, tag filter depuration

## Stale PRs (closed)

PRs #1–#4, #9, #10 were obsolete vs current `main`. Do not reopen or merge them.
