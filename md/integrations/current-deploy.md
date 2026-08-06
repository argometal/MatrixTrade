# Current production deploy pointer

**Do not merge old feature branches into local `main`.** Production truth is GitHub `origin/main`.

| Field | Value |
|--------|--------|
| **Tag** | `main0806a` |
| **Commit** | Always `git rev-parse main0806a` after fetch (must match `origin/main`) |
| **Production URL** | https://matrix-trade-theta.vercel.app |
| **Date** | 2026-08-06 |

## Sync local (avoid conflicts / lost work)

```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
# optional pin: git checkout main0806a
```

## What this deploy includes

- PR #157: A08 Export JSON; runbooks grid/list/board; section check-all; Turn into section
- PR #156: Archive is hide (not delete); persist browse view + status chips
- PR #155: Guest lock calendar + clock pickers for Active from/until and Daily hours
- PR #152: Guest lock — 30-minute password override + account-wide schedule (`guest_lock_policy_state`; apply `supabase/guest-lock-policy.sql`)
- PR #150: Guest lock settings reachable from Argus + Trading (no home redirect)
- PR #147: Network organize (grid/list/board DnD); archive visibility + quiet archive; status chip filters; guest workstation lock
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
