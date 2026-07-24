# Current production deploy pointer

**Do not merge old feature branches into local `main`.** Production truth is GitHub `origin/main`.

| Field | Value |
|--------|--------|
| **Tag** | `main0724c` |
| **Commit** | Always `git rev-parse main0724c` after fetch (must match `origin/main`) |
| **Production URL** | https://matrix-trade-theta.vercel.app |
| **Date** | 2026-07-24 |

## Sync local (avoid conflicts / lost work)

```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
# optional pin: git checkout main0724c
```

## What this deploy includes

- PR #72: Runbooks 24-a1 (sections, ··· menu, DnD, org copy/move) + units 3D molecular graph
- PR #60 / #59: Argusforge evidence recurrence engine + typed modular graph controls
- Realm Treemap 24-17 on `/forge/argus` (units graph at `/forge/argus/units`)
- PR #33: Network Mechanics + Apply + Library (removed Request layer)
- PR #16: Runbooks redesign, scoped drill-down, Timeline/Chronicle UX

## Stale PRs (closed)

PRs #1–#4, #9, #10 were obsolete vs current `main`. Do not reopen or merge them.
PR #56 (shell five-controls) superseded by `ff257ab` on `main` — do not merge.
PR #65 superseded by #72.
