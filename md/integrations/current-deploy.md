# Current production deploy pointer

**Do not merge old feature branches into local `main`.** Production truth is GitHub `origin/main`.

| Field | Value |
|--------|--------|
| **Tag** | `main0805b` |
| **Commit** | Always `git rev-parse main0805b` after fetch (must match `origin/main`) |
| **Production URL** | https://matrix-trade-theta.vercel.app |
| **Date** | 2026-08-05 |

## Sync local (avoid conflicts / lost work)

```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
# optional pin: git checkout main0805b
```

## What this deploy includes

- PR #145: Network people rename (Edit Name + ··· Rename on detail/browse)
- PR #144: Sidebar stays collapsed until expand is clicked (no hover-expand)
- PR #143: Projects & topics portfolio cards (grid/list/board + search-aware DnD organize)
- PR #139: Movable browse cards (List/Cards/Board DnD) + Exit/Cancel on link prompts
- PR #138: Project runbook Edit on organization + returnTo + persistent project/org tabs
- PR #140: Supabase RLS lockdown on all public tables (`rls-lockdown-public.sql`)
- PR #76: 24-1C Chaos builder B0 + architecture; 24-1E Home Explorer; Argus emerald palette; Argus marked Experimental
- PR #74: Argus organize — move decks between Realms + regroup fragments between decks; multi-fragment deck UX
- PR #72: Runbooks 24-a1 (sections, ··· menu, DnD, org copy/move) + units 3D molecular graph
- PR #60 / #59: Argusforge evidence recurrence engine + typed modular graph controls
- Realm Treemap 24-17 on `/forge/argus` (units graph at `/forge/argus/units`)
- PR #33: Network Mechanics + Apply + Library (removed Request layer)
- PR #16: Runbooks redesign, scoped drill-down, Timeline/Chronicle UX

## Stale PRs (closed)

PRs #1–#4, #9, #10 were obsolete vs current `main`. Do not reopen or merge them.
PR #56 (shell five-controls) superseded by `ff257ab` on `main` — do not merge.
PR #65 superseded by #72.
