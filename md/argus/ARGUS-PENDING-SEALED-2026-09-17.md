# Argus — Pending inventory (SEALED)

**Sealed:** 2026-09-17  
**Scope:** Argus product only (not MatrixTrade trading / MXT formulas as networking engine)  
**Rule:** Do not silently expand this list. Add items only with explicit user approval.  
**Deploy pin at seal:** `main0917a` (`8f8415c`)

---

## A. Networking — SEALED next increments

| # | Item | Status |
|---|------|--------|
| N1 | **Outcome log** — Conversation Note (gained/gave + topics) | **Shipped** (this wave) |
| N2 | **Give↔receive matrix** — derived on Person + browse chip Δ | **Shipped** (this wave) |
| N3 | **Attention priority** — smart view **Give ↔ receive** | **Shipped** (this wave) |

**Already had:** who/when (Active/Dormant/Hot), crude “what”, durable Contact Value / My Value marks.

**Still out of scope:** CRM strength scores; Affinity firm graph; auto email/cal scrape; MXT formula port.

**Related ON HOLD:** Network Core tier — `md/argus/network-core-tier-plan.md`.

### Vocabulary seal (same wave)

Homogenized: Topic Tags → `topicTags`; Contact Value / My Value / Conversation outcome / Network Hot vs Tags Hot; Save relationship **marks** (not “outcomes”); ARGUS tagline no longer “Work Tracker”. See `vocabulary-policy.md` Network section.

---

## B. Other Argus pendings (open / not completed)

| ID | Theme | Item | Source |
|----|-------|------|--------|
| P1 | Overview | One Open-work CTA proposal (follow-up → runbook → attention) — awaiting A/B/neither | `overview-pulse-experiment-handoff.md`, `consolidated-product-direction.md` |
| P2 | Graph | Molecule readability retune (preferred next in consolidado); no Forge 3D port | `consolidated-product-direction.md` |
| P3 | Tags ontology | Remaining binders: fuller role/picker coverage beyond Event/Topic | `tag-ontology-001.md` §9 |
| P4 | Topics UI | topic001 draft density — **not** wired to live Topic | PR #344 draft `cursor/topic001-ui-draft-afba` |
| P5 | Inbox | Process-tab / HTML body / production User QA still open | `v2-design-checklist.md` |
| P6 | Deliver | PDF + share-link proposed; Export History / other packages deferred | `deliver-formats-plan.md`, `README.md` |
| P7 | Runbooks | Phase 2: Topic/Event Customize + overlay | `standby-modifications-091601-091602.md` |
| P8 | Data safety | Durable journal / Vercel ephemeral FS split-brain (prod debt) | `p0-data-safety-audit.md`, `README.md` |
| P9 | Model v01 | Schema migration + open Event-definition questions | `knowledge-model-v01.md`, `model-alignment-audit.md` |

---

## C. Explicitly ON HOLD / deferred (do not start without reopen)

| Item | Note |
|------|------|
| Network Core tier + Touch Base import | Plan only |
| Overview ego-mini / sticky Chronicle / extra viz | Parked after pulse experiment |
| Cross-network pattern engine | Thesis: **not planned** |
| Person `/people/[id]`, ⌘K palette, Profile, full filter panels | Deferred v1.2+ |
| Place entity, smart project filters, semantic search | Model audit Step 9 |
| Alexandria spatial research into Argus | Non-binding / frozen repo rules |

---

## D. Recently shipped — not pending

| Item | Pin / PR |
|------|----------|
| Networking N1–N3 + Network vocabulary homogenization | this wave (pre-deploy) |
| Event + Topic Tags: Browse / search Tag universe → assign | `main0917a` / #371–#372 |
| Event Note Add ↔ Tags dual-write | `main0815o` / #359 |
| Home Tags manager + Pattern counts | `main0815n` |
| Runbook check → Use as tag | `main0815m` |
| Events Tags branch DnD | `main0815l` |
| Org Tags Slice 1 | #303 |
| Runbooks Customize Phase 1 + muted text | `implemented-091601-091602.md` |

---

## E. Next recommended focus (when user chooses)

1. **Networking N1→N2→N3** (this seal), or  
2. User-picked item from section B (P1–P9), or  
3. Reopen an ON HOLD item from section C with explicit OK.

**Do not mix** networking build with MXT formula ports or Core-tier import unless reopened.
