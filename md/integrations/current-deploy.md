# Current production deploy pointer

**Do not merge old feature branches into local `main`.** Production truth is GitHub `origin/main`.

| Field | Value |
|--------|--------|
| **Tag** | `main0721d` |
| **Commit** | `85436d5` — or `git rev-parse main0721d` after fetch |
| **Production URL** | https://matrix-trade-theta.vercel.app |
| **Date** | 2026-07-21 |

## Sync local (avoid conflicts / lost work)

```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
# optional pin: git checkout main0721d
```

## What this deploy includes

- PR #14: Topics/Events metrics homologation, neighborhood, portfolio intensity
- PR #15: Vocabulary (Topic / Tag / Alias / Signal), mobile Topics & Events detail, tag filter depuration
- See `md/argus/vocabulary-policy.md`

## Stale PRs (closed)

PRs #1–#4, #9, #10 were obsolete vs current `main`. Do not reopen or merge them.
