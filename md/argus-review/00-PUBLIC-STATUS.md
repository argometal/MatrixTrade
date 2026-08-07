# Argus — public status summary

**Canonical location:** `main` only  
**Path:** `md/argus-review/00-PUBLIC-STATUS.md`  
**Date:** 2026-08-07

**Audience:** humans + ChatGPT / IA  

---

## Open this (on main)

| | URL |
|--|-----|
| **This status** | https://github.com/argometal/MatrixTrade/blob/main/md/argus-review/00-PUBLIC-STATUS.md |
| **Raw (plain text)** | https://raw.githubusercontent.com/argometal/MatrixTrade/main/md/argus-review/00-PUBLIC-STATUS.md |
| **Full pack folder** | https://github.com/argometal/MatrixTrade/tree/main/md/argus-review |
| **Mechanics (library)** | https://raw.githubusercontent.com/argometal/MatrixTrade/main/md/argus/evidence-engine-mechanics.md |
| **Deprecated handoffs list** | https://raw.githubusercontent.com/argometal/MatrixTrade/main/md/argus/DEPRECATED-HANDOFFS.md |
| **Repo ZIP (default branch)** | https://github.com/argometal/MatrixTrade/archive/refs/heads/main.zip → open `md/argus-review/` |

---

## Deprecated handoff methods (do not use)

| Method | Status |
|--------|--------|
| Feature-branch raw URLs (`…/cursor/…/md/…`) | **Deprecated** — connectors often cannot read them |
| Draft PR links / screenshots of links | **Deprecated** |
| “Share branch name with IA” without merge to `main` | **Deprecated** |
| Pasting partial docs in chat instead of `main` paths | **Deprecated** for architecture review |
| Treating `11` as live architecture | **Deprecated** — historical inventory only |
| Draft PR **#162** as Signals/metrics handoff | **Deprecated for access** — decisions stay on this `main` pack |

**Rule:** Argus architecture + Evidence Engine mechanics for external AI live on **`main`**. Full list: [`../argus/DEPRECATED-HANDOFFS.md`](../argus/DEPRECATED-HANDOFFS.md).

---

## What Argus is (one line)

Argus is the **Evidence Organization System** / **Evidence Engine** inside MatrixTrade (`/argus/*`).  
Loop: Receive → Organize → Correlate → Retrieve → Deliver.  
App: https://matrix-trade-theta.vercel.app/argus  

**Not** a Behavior Engine, CRM scorecard, or strength-KPI dashboard.

---

## Evidence Engine (current architecture)

| Doc | Role |
|-----|------|
| [`12-evidence-engine-principles-solution.md`](12-evidence-engine-principles-solution.md) | Sealed principles + solution |
| [`13-evidence-engine-implementation.md`](13-evidence-engine-implementation.md) | What shipped (phases A–D) |
| [`../argus/evidence-engine-mechanics.md`](../argus/evidence-engine-mechanics.md) | **Living runtime mechanics** |
| [`11-behavioral-evaluation-review.md`](11-behavioral-evaluation-review.md) | Historical inventory only (pre-impl) |

**Runtime summary:** one Network status vocabulary (New / Active / Dormant / Lost / Archived); Tags → Patterns only; nav badges = triage debt; no strength% / outcomeScore / org Trust·Future as product metrics.

---

## Related work (not the architecture handoff)

| Item | Note |
|------|------|
| Delete events (product) | Draft PR #161 — separate from this pack |
| Signals↔topic Pattern rollup (optional) | Decisions D1–D5 below — **optional query widen later**; not a new metric type |

---

## Pack file index

| File | Content |
|------|---------|
| `00-PUBLIC-STATUS.md` | This summary |
| `01-README.md` | Pack purpose + reading order |
| `02`–`10` | Evidence pack (map, ontology, flows, open items) |
| `11` | Historical behavioral inventory |
| `12` | Sealed Evidence Engine principles + solution |
| `13` | Implementation notes (phases A–D) |
| `appendix-*.txt` | File / action lists (regenerate when code lists drift) |

---

## What ChatGPT should do next

1. Open **main** URLs above (not branch URLs).  
2. Read `00` → `12` → `13` → `../argus/evidence-engine-mechanics.md`.  
3. Use `01`–`10` for evidence pack detail; treat **`11` as historical only**.  
4. Optionally return Decisions D1–D5 for Signals↔topic Pattern **query** widening.  
5. Do **not** revive feature-branch / draft-PR handoffs.

---

## Suggested default (not approved until IA confirms)

| Decision | Suggested |
|----------|-----------|
| Labels | Keep Aliases (Topic) ≠ Signals (Event) |
| After event↔topic link | Widen topic Patterns + volume to linked-event evidence (bidirectional) — derived query only |
| Events pill on topic | Add |
| Aliases → Patterns | Never |

---

## Paste block for a new ChatGPT thread

```text
Argus Evidence Engine review. Use ONLY files on GitHub main:

https://raw.githubusercontent.com/argometal/MatrixTrade/main/md/argus-review/00-PUBLIC-STATUS.md
https://raw.githubusercontent.com/argometal/MatrixTrade/main/md/argus-review/12-evidence-engine-principles-solution.md
https://raw.githubusercontent.com/argometal/MatrixTrade/main/md/argus-review/13-evidence-engine-implementation.md
https://raw.githubusercontent.com/argometal/MatrixTrade/main/md/argus/evidence-engine-mechanics.md

Folder:
https://github.com/argometal/MatrixTrade/tree/main/md/argus-review

Read 00 → 12 → 13 → mechanics. Treat 11 as historical inventory only.
Branch/PR-only handoffs are deprecated.
```
