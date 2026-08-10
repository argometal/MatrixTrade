# Current production deploy pointer

**Do not merge old feature branches into local `main`.** Production truth is GitHub `origin/main`.

| Field | Value |
|--------|--------|
| **Tag** | `main0808t` |
| **Commit** | Always `git rev-parse main0808h` after fetch (must match `origin/main`) |
| **Production URL** | https://matrix-trade-theta.vercel.app |
| **Date** | 2026-08-10 |
| **IA handoff** | [`md/argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md) |

## Sync local (avoid conflicts / lost work)

```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
# optional pin: git checkout main0808h
```

## What this deploy includes

- PR #240: Tags tab render style + clickable Event/branch Tags
- PR #238: Tags tab hierarchy — attached → branch → Trackers → universe
- PR #236: Event binder Event Tags editor (`eventTags`) — separate from Note evidence
- PR #234: Tag ontology ORDER 001 — TagRole fields, scoped pickers, Home role chips
- PR #232: Event Mark completed uses Archive — out of metrics; help explained
- PR #230: Tag-first Event flow — create Tag on Note, Flag Tracker later
- PR #228: Unify Links tab (Event/Topic/Org/Project) — metric pills + graph
- PR #226: Topic Connections — clear Link CTAs per relation (Events / orgs / projects / people)
- PR #224: Topic Chronicle aggregates linked Event evidence (Event-first lens)
- PR #222: Event UI explanations behind contextual ? (Note / Chronicle / Metrics)
- PR #220: Guided Note Tag picker — Topic reuse → recent → universe → create last
- PR #218: Separate Note Tags (checkbox) from Flag Trackers; Event tab Trackers
- PR #216: Contextual `?` help popover (per-view sheet) + Help index; strip on-screen explanation chrome
- PR #215: Deprecate Inbox Converted — fold into Archived (Journal) with Open note path
- PR #214: Create pick sheet taller on phone — five levels + Exit visible without scroll
- PR #213: Mobile top bar — space private lock away from menu A
- PR #212: Inbox Status dropdown + grouped Filters; Converted clarified as legacy email→journal
- PR #211: Filterable Help (topic groups + search); Intel legends off Home canvases → ? Help deep links
- PR #210: Home Intelligence one-line toolbar (Intel/Browse toggle + surface/filter dropdowns; taller viewers)
- PR #209: Confirm Tag↔Tracker Flag/Disable both ways; Event/Topic Tags split “On this …” inventory vs Other Trackers
- Hotfix: remove merge conflict markers from Network relationship metrics help (`NetworkRelationshipMetricsFields`)
- PR #208: Network Apply = MTA Validate → Accept (Clear, Snap Failure, Fix before Accept); Contact/My value fields only
- PR #207: Network status simplified to Active / Dormant / Archived + Hot priority filter (New⊂Active, Lost⊂Dormant); viewer hover names
- PR #206: Orphans triage homologated (Topics · Events · Inbox); Events latest-first + Show more
- PR #205: Topic Active/Quiet/Orphans chips sync with board pins
- PR #204: Tag ↔ Tracker toggle without easy delete (Event/Topic/Home Manage)
- PR #203: Topic Tags back in one Tag system; Tracker = Flag/Disable (never deletes); dual neighborhood (main zoom + small one-level-up dock); Home **Browser** rename; Universe/Hot/Patterns/Stale/Trackers on Treemap · Portfolio · Tags
- PR #200: Tags + **Trackers** (Flag = action); Home Tags control center; neighborhood docks on Treemap/Portfolio/Tags; library MD aligned (no radioactive / Focus Tags wording)
- PR #201: Topics browse evidence = Topic ∪ linked Events; Grid / List / Manage hover names
- PR #198: Topic Chronicle only (drop Timeline); Tags tab rolls up Patterns + Note Tags from linked Events; Connections Event chips show dates
- PR #196: Topic/Event binder chips + reverse links on all levels (Org/Project/Person Links; Link modal outbound∪reverse; Kind parsing harden; create/save mirror)
- PR #192 / #194: Tags Universe exploration workspace (+ Vercel typecheck fix for test fixtures)
- PR #177: Remove Dashboard **Paste AI Block (legacy)** — AI Blocks via Control → Apply only
- PR #189: Treemap includes full org/project/topic portfolio (no top-24 cut; empty projects like Exxon appear)
- PR #187: Deprecate Home aside Tag portfolio graph; Tag universe only under Intelligence → Tags
- PR #185: Count legacy topic↔event binders (`linkedTopicIds`/`linkedEventIds`); Topics = status pills + one Filters menu; Chronicle filter removed
- PR #183: Empty topics respect event links (linked-only → Quiet); Topics status pills only (no duplicate tabs/Filters); deprecate Chronicle filter chips
- PR #182: Network status chips only (no duplicate metric cards); Intelligence Treemap first / Tags third; Topic↔Event link mirror
- PR #181: Tag universe on Intelligence → Tags (filter/search/Flag/Remove + recency×recurrence); Portfolio bubble separation
- PR #180: Focus Tags portfolio on Home (recency × recurrence, filter, Flag/Unflag) — superseded by Trackers in #200
- PR #178: Single sidebar expand arrow (remove duplicate TopBar `»`)
- PR #176: Topic↔Event metric/filter parity + Focus-trigger graph halos (neighbor policy shared both sides; Event attendees = People)
- `main0807h`: Dedupe Help / Security / Home nav icons (TopBar + sidebar brand)
- PR #175: Event Tags restored (Note Tags + Focus Tags tab); Topic Aliases → Match tags; keep TAGS ontology
- PR #174: Event/Topic **Edit** menu — Rename / Archive / Delete event (visible next to title)
- PR #173: Focus Tags replace Event Signals — journal `signalTags` (now **Trackers** / Flag action — see #200)
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
