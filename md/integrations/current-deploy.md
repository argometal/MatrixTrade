# Current production deploy pointer

**Do not merge old feature branches into local `main`.** Production truth is GitHub `origin/main`.

| Field | Value |
|--------|--------|
| **Tag** | `main0807s` |
| **Commit** | Always `git rev-parse main0807s` after fetch (must match `origin/main`) |
| **Production URL** | https://matrix-trade-theta.vercel.app |
| **Date** | 2026-08-08 |
| **IA handoff** | [`md/argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md) |

## Sync local (avoid conflicts / lost work)

```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
# optional pin: git checkout main0807s
```

## What this deploy includes

- PR #192: Tags Universe as evidence exploration workspace (select → evidence; no cloud/score/dup Focus editors)
- PR #177: Remove Dashboard **Paste AI Block (legacy)** — AI Blocks via Control → Apply only
- PR #189: Treemap includes full org/project/topic portfolio (no top-24 cut; empty projects like Exxon appear)
- PR #187: Deprecate Home aside Tag portfolio graph; Tag universe only under Intelligence → Tags
- PR #185: Count legacy topic↔event binders (`linkedTopicIds`/`linkedEventIds`); Topics = status pills + one Filters menu; Chronicle filter removed
- PR #183: Empty topics respect event links (linked-only → Quiet); Topics status pills only (no duplicate tabs/Filters); deprecate Chronicle filter chips
- PR #182: Network status chips only (no duplicate metric cards); Intelligence Treemap first / Tags third; Topic↔Event link mirror
- PR #181: Tag universe on Intelligence → Tags (filter/search/Flag/Remove + recency×recurrence); Portfolio bubble separation
- PR #180: Focus Tags portfolio on Home (recency × recurrence, filter, Flag/Unflag)
- PR #178: Single sidebar expand arrow (remove duplicate TopBar `»`)
- PR #176: Topic↔Event metric/filter parity + Focus-trigger graph halos (neighbor policy shared both sides; Event attendees = People)
- `main0807h`: Dedupe Help / Security / Home nav icons (TopBar + sidebar brand)
- PR #175: Event Tags restored (Note Tags + Focus Tags tab); Topic Aliases → Match tags; keep TAGS ontology
- PR #174: Event/Topic **Edit** menu — Rename / Archive / Delete event (visible next to title)
- PR #173: Focus Tags replace Event Signals — journal `signalTags` watchlist; highlight-critical in Patterns/cloud
- PR #172: Chronicle PIN delete for linked notes + stop note resurrection (`Chronicle: v2` marker; soft-deleted counts as migrated)
- PR #171: Stop ghost chronicle notes on every Event open (idempotent legacy migration)
- PR #170: Clean Argus/trading login — drop Work Tracker tagline and guest-lock banner
- PR #169: Guest lock daily hours use this computer’s local timezone (not server UTC)
- PR #168: Chronicle note delete — PIN unlock; remove per-row TOTP env legend
- PR #167: Chronicle multi-select note delete + PIN/authenticator lock (Events, Topics, Network)
- PR #166: Evidence Engine (A–D) — sealed Network status vocab; remove strength%/decorative trust scores; chronicle signal-stamp fix + Note soft-delete; Timeline/Chronicle ontology; graph ego focus (click node → neighbors)
- PR #159: Runbook ··· Delete (check or section block) + board default on Runbooks library
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
