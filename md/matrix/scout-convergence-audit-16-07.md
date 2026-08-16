# 16-07 — Scout convergence audit (diagnose only)

**Status:** Diagnosis only — **no code changes**, no new states, no new pages.  
**Date:** 2026-08-16  
**Context:** After 16-04 Operational War Universe + 16-01 Needs Attention cleanup + 16-03 Monitoring buckets.  
**Surfaces:** Scout Learning Queue · Watching (case summary) · Execute  
**Reference:** Prefer Execute’s density / hierarchy for Watching convergence.

---

## Naming (to avoid mixing products)

| Name in this audit | What it is in code | Not the same as |
|--------------------|--------------------|-----------------|
| **Watching** | Scout Desk focused case card — `data-scout-case-summary` in `PreviewPlanning.tsx` | Dashboard **Waiting** (16-03 approaching bucket) |
| **Execute** | `ScoutExecutePanel` — `data-scout-execute` | Trades ledger / Enter Trade routes |
| **Learning Queue** | `data-scout-learning-queue` banner on Scout Desk | `/stats` pipeline aggregates · LO stores |

Conceptual target:

```text
Watching  → understand what I am waiting for
Execute   → act when it is time
```

Same Scout product, two states — not two apps.

---

## 1. Current map

### A. Scout Learning Queue

| Aspect | Evidence |
|--------|----------|
| **Where** | `PreviewPlanning.tsx` · `data-scout-learning-queue` (amber banner above Case) |
| **Why it lives in Scout** | P0 from [scout-learning-circuit-audit-handoff.md](scout-learning-circuit-audit-handoff.md): Case dropdown no longer lists terminal plans (war-only), so discovery for “close the circuit” was added **on Scout** |
| **Predicate** | `planNeedsStrategyReview` → `failed\|expired\|skipped` **without** `outcome.recordedAt`; `planNeedsLearningSyncRepair` → outcome persisted but sync `pending\|failed` (`lib/plan-helpers.ts`) |
| **Not war universe** | Explicitly excluded by `isWarReadyScoutPlan` (status not watching\|ready; or outcome; or sync-repair) |
| **UI copy** | e.g. `TSLA · PLAN-001 · expired · needs outcome` |
| **Action** | Click → `focusPlanFromAllocation` + mounts `PlanRecordOutcomePanel` (`data-scout-outcome-panel`) |
| **Actionable?** | **Yes for needs-outcome** (must record plan-outcome). Sync rows are **repair** after auto-retry (16-01); less “decide”, more “unstick” |
| **Lifecycle** | Historical **terminal** plans, not live battles — correct domain for Learning, wrong density for war desk |

**Unique function after 16-01 + 16-04?**

| Still unique on Scout? | Verdict |
|------------------------|---------|
| Discovery when human is already on Scout Desk | Weakly unique |
| Mount Record Outcome / Retry Sync next to Case | Convenient, not architecturally required |
| Same work as Dashboard Needs Attention (`plan-review-*`, `plan-outcome-sync-*` → `/planning?plan=`) | **Duplicates ATTN** |

**Recommendation lean:** **Relocate / collapse** — do not treat as a third permanent Scout product surface. Prefer Dashboard ATTN as inbox; Scout only opens outcome panel when deep-linked (`?plan=PLAN-xxx`). Optional: tiny one-line “N plans need outcome” link to Dashboard, not a full list.

---

### B. Watching (case summary)

Source: focused non-orphan card · `data-scout-case-summary`.

| Block | Classification | Notes |
|-------|----------------|-------|
| Ticker · thesis id · Stock File status chip | **Indispensable** (identity) | Keep |
| Consolidated operational tag (verdict + OA) | **Indispensable** | Answers “what am I watching?” |
| Zone / Entry / Stop / Target | **Indispensable** | Battle geometry |
| Plan R:R · Executable R | **Indispensable** (decide) | Keep sparse |
| Wait Horizon | **Indispensable** for Watching | “What has to happen / how far” |
| Room (monthly loss) | **Funding** | Belongs nearer Execute / Capital — duplicate with Execute funding |
| Execution readiness | **Acción / borderline** | Useful; can be one line in tag, not a grid cell |
| 3×3 (ish) metric grid chrome | **Diagnóstico / density** | Execute uses calmer 2–4 cell grid |
| `ScoutAllocationImpact` | **Funding / allocation** | Competing with Allocation Strip + Compare + Execute capital |
| Detected vs Confirmed mismatch banner | **Diagnóstico** | Keep only when mismatch |
| Update operational state (presets + phrase + JSON preview) | **Acción** (Apply path) | High density; Watching should ask “what must occur?”, not host full Apply workshop |
| Snapshot + Details buttons | **Acción / histórico** | Details OK collapsed |
| `ScoutFundingExecutionMenu` + Prepare trade | **Acción / funding** | Overlaps Execute — Prepare belongs with Execute |
| `ScoutPrepareAllocationNote` | **Funding** | Execute language |
| Details accordion (Thesis / Invalidation / Fills / Evidence) | **Histórico / dossier** | Keep collapsed; not first viewport |
| Verdict-tinted whole-card background | **Visual noise** | Execute uses one accent border (emerald), not full wash |

**Does Watching answer the right question today?**  
Partially. Geometry + wait horizon are present, but the card also dumps funding, allocation impact, operational Apply workshop, prepare-trade, and dossier — i.e. a **PLAN dump**.

---

### C. Execute (`ScoutExecutePanel`)

| Block | Role | Reuse for Watching? |
|-------|------|---------------------|
| Header `Execute · PLAN-id` + single primary CTA (Trade boot) | Clear hierarchy | Yes — Watching header pattern |
| Accent border (`border-emerald-500/30`, muted fill) | Contained color | Yes — Watching sky/zinc accent, same structure |
| Compact levels `dl` grid (Entry/Stop/Target/R, optional Shares) | Fast read | Yes — Watching should match this grid density |
| Capital / funding summary box | One job | Keep **in Execute**; remove from Watching primary |
| Stale reservation / funding follow-up callouts | Conditional alerts | Pattern reusable |
| Technical actions `<details>` (Family B, layered, manual JSON) | Progressive disclosure | Pattern for Watching ops/update + Details |
| Empty / expired guards | Honest states | Keep |

Execute is the **convergence reference**: fewer simultaneous jobs, clearer header, muted accent, dense-but-scannable metrics, secondary work under fold.

---

### D. Surrounding Scout Desk chrome (feeds Watching noise)

| Surface | Job | Overlap |
|---------|-----|---------|
| Header: New stock case / Capital Planner / Allocation Board | Navigation | OK |
| Learning Queue | Learning close | Overlaps ATTN |
| Compare active scouts (`ActiveScoutsComparisonTable`) | Multi-scout monetary / allocation pick | Overlaps Allocation Strip + Board |
| `ScoutAllocationStrip` | Selection summary | Overlaps Compare + Impact on Watching |
| Case dropdown | War Case picker (`isWarReadyScoutPlan`) | Clean after 16-04 |
| Plan map side panel | Geometry map | Separate; OK |

---

## 2. Duplications (priority)

| Topic | Surfaces | After 16-01/16-04 |
|-------|----------|-------------------|
| Terminal plan needs outcome | Learning Queue · Dashboard ATTN · deep-link outcome panel | **Triplicate discovery** — ATTN should own inbox |
| Learning sync failed | Learning Queue · ATTN (post auto-retry) | Duplicate |
| Entry / Stop / Target / R | Watching grid · Execute levels · Plan map | Expected; Watching+Execute should share one visual language |
| Capital / room / funding | Watching Room cell · Allocation Impact · Allocation Strip · Execute funding box · Funding menu | **Worst overlap** — collapse into Execute (+ Board) |
| Prepare trade | Watching Funding menu · Execute (intentionally moved once; Watching still hosts menu) | Watching should drop Prepare |
| Operational status Apply | Watching full workshop | Should be secondary / Control-first, not Watching hero |
| Compare vs Allocation Strip vs Impact | Three allocation UIs on one scroll | Trim to Strip → Board; Impact only when selected |

---

## 3. Reusable components / styles (from Execute → Watching)

Reuse **patterns**, not a second design system:

1. **Section shell** — `rounded-2xl border …/30 bg-…/10 p-4` + small title row.  
2. **Metric `dl` grid** — `grid-cols-2 … sm:grid-cols-4`, `border-zinc-800 bg-zinc-950/50`, label `text-zinc-600`, value tabular.  
3. **Single accent** — one border tint (Watching: sky/zinc; Execute: emerald); avoid verdict-washed full card.  
4. **One primary CTA row** — Execute’s Trade boot; Watching equivalent: “Open Plan map” or “Update status” as secondary under fold.  
5. **Progressive disclosure** — Execute `Technical actions`; Watching: ops update + Details + funding links.  
6. **Conditional callouts** — same amber/sky alert chips (mismatch, stale) — only when true.

Do **not** invent new tokens, card kits, or a “Watching DS”.

---

## 4. What I would remove (from Scout Desk primary)

| Remove / demote | Why |
|-----------------|-----|
| Full **Scout learning queue** list on every Scout visit | ATTN owns actionable inbox; queue is lifecycle, not war |
| **Room** + funding decision chrome on Watching | Execute’s job |
| **`ScoutFundingExecutionMenu` / Prepare trade** on Watching | Execute / Control Apply |
| **`ScoutAllocationImpact`** always-on in Watching | Board / Strip; optional when multi-select |
| Always-open **operational Apply workshop** (presets + JSON) | Demote under details / Control |
| Verdict **full-card color wash** | Noise vs Execute |

---

## 5. What I would move

| Move | From → To |
|------|-----------|
| Needs-outcome / sync repair discovery | Scout banner → **Dashboard Needs Attention** only (deep-link keeps outcome panel on Scout) |
| Record Outcome when human chooses a terminal plan | Keep panel mount via `?plan=` / ATTN — not via permanent queue |
| Capital / shares / funding status | Watching → **Execute** (already mostly there) |
| Multi-scout capital comparison | Desk Compare/Impact → **Allocation Board** as home; Strip as thin reminder |
| Ops status phrase → Apply | Watching hero → collapsed “Confirm state” or Control Apply |

---

## 6. Proposed Watching (simplified) — Execute language

**First viewport (one job):**

```text
┌ Watching · TICKER · PLAN-id ─────────────┐
│ Tag: watching · approaching · 2.1R        │
│                                           │
│ Zone · Entry · Stop · Target · Wait       │  ← Execute-density dl grid
│                                           │
│ Trigger line (1 sentence):                │
│ “Act when price accepts zone / armed.”    │
│                                           │
│ [Plan map]     [Confirm state ▾]          │  ← secondary
└───────────────────────────────────────────┘
```

**Below fold / same page:**

- Execute panel (unchanged role) when readiness / human intent is act.  
- Details (thesis, invalidation, fills, evidence).  
- Confirm state expands presets → Apply (not always visible).  
- No Learning Queue list; no Allocation Impact wall; no Prepare trade.

**State split:**

| State | Surface emphasis |
|-------|------------------|
| Vigilance (approaching / distant / watch) | Watching card |
| Act / armed / in zone / funded | Execute panel |

Same shell, different accent and CTA — not different products.

---

## 7. Is 16-04 lean architecture?

### Verdict: **Yes for war membership — with known parallel lanes (by design), not compensatory UI patches**

| Check | Result |
|-------|--------|
| One canonical predicate | **`isWarReadyScoutPlan` / `isOperationalWarPlan`** in `lib/plan-helpers.ts` |
| Consumers reuse it | Case cards, Compare/allocation plans, prospects, monetary rows, Control/Dashboard active counts, plan-snapshot active, mechanics brief focus, stock-file analyze **prefer** war plan, allocation page |
| Case not hiding bad plans only in UI | Terminal / outcome / missed OA **excluded in predicate**; Learning Queue is a **separate** list using review/sync helpers |
| Local `watching\|ready` filters for menus | **Removed** from war consumers (report `tools/report-war-universe-16-04.ts` still documents legacy for diff only) |

### Residues (not membership patches)

| Residue | File | Nature |
|---------|------|--------|
| Display override `executionReadiness === "armed"` → show armed/act | `PreviewPlanning.tsx` | Presentation on top of OA — **not** alternate universe |
| `pickFocusPlan` fallbacks `entered` / `expired` | `stock-file-analyze.ts` | Analyze package focus, not War Case menu |
| `plan-snapshot` needsReview filter | `plan-snapshot.ts` | Learning text for AI; slightly narrower than `planNeedsStrategyReview` (misses `skipped`) — doc/AI inconsistency, not Case filter |
| Scout monitoring buckets | `scout-monitoring.ts` | Dashboard Action/Waiting/Needs review — re-checks superseded/review for **bucket** gating; war Case already filtered upstream when linking |
| Execute expired banner | `ScoutExecutePanel.tsx` | When focused plan is learning/terminal via deep-link — honest guard |
| Learning Queue predicates | `planNeedsStrategyReview` / sync | **Correct** parallel lifecycle lane — must stay out of war predicate |

**Conclusion:** 16-04 is structural and lean for **Operational War Universe**. It does not look like a temporary visual filter. Remaining complexity is **Scout Desk UI accretion** (Learning + Watching dump + Allocation + Execute), not a broken war predicate. Convergence work is **delete/relocate UI**, not re-filter war membership.

---

## Decision gates (before any implementation)

- [ ] Confirm Learning Queue → collapse to ATTN (+ deep-link outcome panel)  
- [ ] Confirm Watching first viewport = identity + geometry + wait/trigger only  
- [ ] Confirm funding/prepare stay Execute-only  
- [ ] Confirm Allocation Impact not always mounted on Watching  
- [ ] No new Scout states / pages in the trim pass  

**Next coding slice (when approved):** UI trim / relocate only — no new features.
