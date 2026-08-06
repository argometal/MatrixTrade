# 09 — Open items

**Constraint:** Current TODOs, known limitations, incomplete implementations, and technical debt **already identified in the repository**. Nothing speculative.

---

## README Known weaknesses

Source: `md/argus/README.md` “Known weaknesses”:

| # | Weakness |
|---|----------|
| 1 | Docs split across `md/argus/` and `md/integrations/` |
| 2 | v3 runtime vs v01 target confuses readers |
| 3 | Checklist lags code (person v2, export, inbox Process) |
| 4 | Deliver layer only partially built — Export Center UI + Vault API; other packages + history deferred |
| 5 | Inbox follow-up does not feed person Attention metrics |
| 6 | Legacy routes still exist |
| 7 | Production data on Vercel needs Supabase |

---

## Model alignment audit — blocking conflicts

Source: `md/argus/model-alignment-audit.md`

| ID | Conflict |
|----|----------|
| C1 | Dual Evidence (inbox convert duplicates) |
| C2 | Polymorphic `entityIds[]` |
| C3 | `log.topics[]` Topic≠Tag overload |
| C4 | JournalKind event/follow_up |
| C5 | Generic Entity + notes Kind hack |
| C6 | Project `linkedTags` / `linkedPersonIds` |
| C7 | Supabase split brain (inbox Postgres / journal JSON) |

Document status: “Not aligned”; v01 DDL draft not applied / not wired.

Step 9 deferred backlog (same file): smart project filters; Topic/Event/Tag product pages; Place entity; semantic search; ClassificationStatus policy.

---

## Checklist deferred / partial

Source: `md/argus/v2-checklist-solutions.md`

| Item | Classification in file |
|------|------------------------|
| Profile avatar | Deferred — static until user profile model |
| Person detail v2 | Deferred — Phase 2 *(also marked Implemented elsewhere in same file)* |
| Replace `/argus/journal` | Deferred — by design |
| Reminders nav | Partial — `/argus/journal` until v2 reminders view |
| Network Filters button | Partial |
| Next deferred work list | Person `/argus/v2/people/[id]`; Reminders/Follow Ups routes; search palette; Profile; full filter panels |

---

## TODO / FIXME in Argus code

Scan under `app/argus`, `lib/argus`, `app/api/argus` for `TODO` / `FIXME`: **no matches** (2026-08-06).

Other markers found:

- “Legacy notes hack” comment in `entity-lifecycle.ts`
- `@deprecated` on hard-delete paths (e.g. inbox-store)
- Help copy “not yet linked”

---

## PARTIALLY IMPLEMENTED

Exact string `PARTIALLY IMPLEMENTED`: **not found** in `md/`, `app/argus`, `lib/argus`.

Near-equivalents already in docs:

| Marker | Location |
|--------|----------|
| “Deliver layer only partially built” | `md/argus/README.md` |
| Status label **In progress** | `md/argus/README.md` legend |
| “v2 shell, inbox, network metrics, and Evidence Vault v1 are **in progress**” | `md/integrations/argus-architecture.md` |
| Checklist Partial / `[~]` | `v2-design-checklist.md` / solutions |
| Architecture scalability Partial / Blocked / Not ready | `argus-architecture.md` |
| knowledge-model phases Pending; DDL Draft for review | `knowledge-model-v01.md` |

---

## Architecture open Event questions (unresolved in constitution)

Source: `md/integrations/argus-architecture.md` “Event (open — do not redesign yet)”:

1. What is an Event?
2. Differentiator vs Log?
3. Calendar module?

*(Exact wording in that file.)*

---

## Storage / production limitations (already documented)

| Item | Source |
|------|--------|
| P0 data safety: journal on ephemeral serverless filesystem unsafe on Vercel without cloud | `md/argus/p0-data-safety-audit.md` |
| Cloud-first email audit: storage routing wrong for production | `md/integrations/argus-cloud-first-audit.md` |
| Rule 0 protected data map | `md/argus/rule-0-protected-data-audit.md` |

---

## Knowledge model v01 deferred

Source: `knowledge-model-v01.md`: Private Evidence column, Topic merge policy, append-only revisions, Place entity v01.1+.

---

## Network Core tier

Source: `md/argus/network-core-tier-plan.md` — **Status:** Plan only · no schema/UI ship yet · ON HOLD.
