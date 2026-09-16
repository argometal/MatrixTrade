# Standby modifications — 091601 & 091602

**Status:** **Shipped** — see `implemented-091601-091602.md`.  
**091601:** Runbooks — see Phase 1 decisions below.  
**091602:** Runbook UI text contrast (below).

---

## 091602 — Increase muted text visibility (~30%)

**Request (confirmed):**

- Gray notes, helper copy, and secondary writings across the interface are **too soft** and **hard to read**.
- The **layout and interface are fine** — only **typography/color** needs work.
- Most body/helper text should be **more visible**: increase perceived lightness/brightness of muted text colors by **~30%** so labels, hints, subtitles, and zinc-style secondary copy read clearly without redesigning screens.

**Scope (when implemented):**

- Audit Argus v2 (especially Runbooks tab, work panel, entity shells) for `text-zinc-500`, `text-zinc-600`, `text-zinc-400`, and similar muted classes.
- Bump muted foreground tokens or utility usage ~30% toward lighter zinc (or shared CSS variable), preserving hierarchy (primary vs secondary vs disabled).

**Relation to 091601:** Independent UI pass; can ship before or after runbook customize work.

---

## 091601 — Runbooks

### Phase 1 scope (first ship)

**Project level only** — not Topic, Event, or other surfaces yet.

Includes (from original 091601 plan):

- **Run vs Customize** toggle on Project runbooks (heavy builder hidden until Customize).
- **Full edit** at Project when Customize is on (same capabilities as Organization work panel).
- **Child runbook links** — separate runbooks, quick **navigate away and back** (not inline expand).
- **Guardrails:** delete **entire checklist / full template** only on **Organization**, with strong confirmation.

### Data model — agreed direction

| Topic | Decision |
|--------|----------|
| Edit shared master from Project | **Acceptable** — user OK if Project Customize changes the shared template for all linked entities (one change affects many). |
| Delete whole runbook / wipe checklist | **Organization only** + protection (confirm; no casual delete from Project). |
| Overlay layer (C) | **Target long-term** with ability to **roll back** if something goes wrong. **Start simple** for stability; evolve to overlay when proven. Implementation choice: simple first unless confident in overlay MVP. |
| Fork vs scary “edit master” confirm | Follow **best-in-market** pattern (template library + **per-use customization**; industry default is **instance/edit after assign**, not constant org round-trips — implement the stable variant that matches that, starting simple on Project). |
| “Based on org template X” + re-sync UI | **Keep simple** — re-sync from master is enough when needed; no heavy lineage UI in v1. |
| Child runbooks | **Navigation only** — open linked runbook, work on it, return; segregate content into separate runbooks rather than one giant list. |

### Unchanged

- Organization remains **master library / primary builder** (create, assign, copy/move between orgs).
- Topic / Event: **Phase 2+** (same pattern later if Project proves stable).

### Phase 2 (later)

- Topic / Event Customize + links.
- Overlay layer (C) with rollback, if not in Phase 1.
- Optional re-sync from org master (explicit action).
