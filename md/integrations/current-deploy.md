# Current production deploy pointer

**Do not merge old feature branches into local `main`.** Production truth is GitHub `origin/main`.

| Field | Value |
|--------|--------|
| **Tag** | `main0721c` |
| **Commit** | tip of `origin/main` — run `git rev-parse main0721c` (do not use old PR branches) |
| **Production URL** | https://matrix-trade-theta.vercel.app |
| **Date** | 2026-07-21 |

## Sync local (avoid conflicts / lost work)

```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
# optional pin: git checkout main0721c
```

If you have local uncommitted work you care about: `git stash -u` first, then reset, then re-apply carefully.

## What this deploy includes

- Canonical Topics/Events entity counts (org → project → network → events)
- Neighborhood reverse links; graph on Topics/Events detail (not Home)
- Portfolio amber tag-pattern intensity; Home treemap unchanged

## Stale PRs (closed)

PRs #1–#4, #9, #10 were obsolete vs current `main` (hundreds of commits behind / conflicting). Do not reopen or merge them.
