# MatrixTrade — building backlog

**Last updated:** 2026-07-22  
**Purpose:** Active product/ops work — priorities, blockers, resume targets. Not library doc debt (see [library-alignment-backlog.md](library-alignment-backlog.md)).

---

## FORWARD — MTA-002 Operability (priority north star)

| Field | Value |
|-------|-------|
| **Priority** | **HIGH** — important while still polishing; **not** a new engine |
| **Status** | **002A shipped** · **P1 incomplete-closed alert shipped** · **002C Trend playbook seeded** · **Needs Attention AI shipped** · **002B postponed** (until live prompt tests) |
| **Doc** | [mta-002-operability-plan.md](mta-002-operability-plan.md) · [needs-attention-ai-workflow.md](needs-attention-ai-workflow.md) · [secular-trend-continuation.md](secular-trend-continuation.md) |
| **Shipped (002A)** | `lib/stock-file-analyze.ts`; Stock File → Analyze with AI / Apply AI Result / Open Scout; `openPanel({ step: "apply" })`; Mechanics **rev 23** |
| **Shipped (P1)** | Trades banner + Dashboard attention for closed≠complete (`lib/incomplete-closed-trades.ts`) |
| **Shipped (002C seed)** | Playbook `secular-trend-continuation` (TESTING) + MD — Family B vs `structural-pullback-entry` Family A |
| **Shipped (Needs Attention AI)** | Task snapshots + Copy for AI / Apply / Go; Library Index; learning attention (OBS + attribution); `tools/test-needs-attention-ai.ts` |
| **Phases left** | **002B** postponed · live Family B calibration · optional `plan-outcome` Apply block (gap documented) |
| **Shipped (Observation UX)** | Closed-trade Observation form on `/trades/[id]`; ensure OBS on save; Apply path can seed OBS for closed fills |
| **Shipped (002C UI)** | Family B checklist on Scout / Stock File / Trade when playbook = `secular-trend-continuation` |
| **Do not build now** | Coach, wide MAF dashboards, VP/AVWAP, more Control categories, parallel prompt systems, parallel AI workflow DB |
| **Also shipped** | Scout Case list ordered by planned R high→low (`lib/scout-case-sort.ts`) |
| **Shipped (layered R/risk)** | `lib/layered-entry-risk.ts`; `rules.defaultRiskBudget`; Plan map R/risk fill states; MAF layered fill fields; Mechanics rev **24→25** |
| **Shipped (Family B bull-trend)** | `lib/family-b-assessment.ts`; Scout `FamilyBBullTrendPanel`; `familyBAssessment` on decision-update; Analyze package section |

---

## Active — Control IA

| Field | Value |
|-------|-------|
| **Priority** | HIGH |
| **Status** | **Shipped** — Matrix Mechanics · Stock Files · Apply · Library |
| **Doc** | [control-panel-ia.md](control-panel-ia.md) |
| **Next** | Feeds **MTA-002A** (collapse Stock File usage to ≤3 primary actions). Closed≠complete alert lives on **Trades** (P1 shipped) |

---

## Active — MTAE (Technical Analysis Engine)

| Field | Value |
|-------|-------|
| **Priority** | HIGH |
| **Status** | **Foundation + Participation Phase A shipped** |
| **Doc** | [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md) · [mtae-participation-layer.md](mtae-participation-layer.md) · [adr-0005-mtae-participation.md](adr-0005-mtae-participation.md) |
| **Shipped** | Geometry assessment + optional `participation` / `participationSynthesis`; validate + protocol; Mechanics **rev 20**; calibration errorTypes for overclaims |
| **Next** | Include participation lane in **MTA-002** master prompt; live chart-pack loops. Phase B (VP / AVWAP) still deferred |

---

## Active — MAF (Matrix Attribution Framework)

| Field | Value |
|-------|-------|
| **Priority** | HIGH |
| **Status** | **V1 foundation + Learning Outcome + Observation shipped** |
| **Doc** | [maf-matrix-attribution-framework.md](maf-matrix-attribution-framework.md) · [adr-0004-maf.md](adr-0004-maf.md) |
| **Shipped** | `attribution` + `observation-update`; `LO-xxx` / `OBS-xxx` stores; auto hooks on trade close / plan outcome; deterministic rule hints; Mechanics **rev 19** |
| **Components** | thesis · zone · entry · stop · execution · trade management · timing · capital allocation |
| **Next** | Live Family B use; expectancy aggregation remains **EVALUATION / defer** |

---

## ON HOLD — high priority

### Scoped AI Grant API (GET link for external IA)

| Field | Value |
|-------|-------|
| **Priority** | **HIGH** |
| **Status** | **ON HOLD / PENDIENTE** |
| **Resume target** | ~early August 2026 (user break — ~3 weeks) |
| **Doc** | [scoped-ai-access.md](scoped-ai-access.md) |
| **Why blocked** | Needs Supabase durable storage for grants + manual ops (SQL, env, seed) + end-to-end testing with user attention. Cannot code/test now. |
| **Root cause** | **Grant persistence** — grants must survive Vercel serverless (no writable `data/scoped-ai-grants.json`). **Not** a Vercel API routing/auth block. |

**Goal:** External IA reads one ticker’s scouting context via `GET /api/matrix/scout/{grantId}` (share `contextUrl`, not `humanPageUrl`).

**Feature freeze:** Until `stock-case-cloud.sql` is confirmed applied **and** end-to-end grant flow verified, treat the grant read path as **frozen but wanted** — code exists; prod validation pending.

---

## Requirements checklist (resume in August)

Execute in order when resuming. No code changes required if checklist passes.

### 1. Supabase schema

- [ ] In **Supabase → SQL Editor**, run `supabase/stock-case-cloud.sql` (after `supabase/schema.sql`).
- Creates: `stock_theses`, `market_evidence`, `scoped_ai_grants`
- Alters: `trade_plans` — `stock_thesis_id`, `decision`, `decision_history`, `scout_lifecycle`, `probe`, `layered_entry`, `execution_method`
- Or run `supabase/trade-plans-layered-entry.sql` if `stock-case-cloud.sql` was applied before layered-entry columns were added.

### 2. Vercel environment

- [ ] `TRADES_STORE=supabase`
- [ ] `SUPABASE_URL` (project URL)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- [ ] Redeploy after saving env

### 3. Seed (optional if tables empty)

```bash
npx tsx tools/seed-supabase.ts
```

Seeds trades, playbooks, stock profiles, evidence, plans from local JSON when present.

### 4. Create grant (UI)

- [ ] Open Stock Profile → **Create AI access link**
- [ ] Share **`contextUrl`** (`GET /api/matrix/scout/GRANT-xxx`) with external IA — **not** `humanPageUrl` (`/scout-access/...`)

### 5. Verify read path

```bash
curl -s -w "\nHTTP:%{http_code}\n" "https://matrix-trade-theta.vercel.app/api/matrix/scout/GRANT-xxx"
```

- [ ] HTTP **200** with plain-text scouting context (not 401 expired, not 404 missing grant)

### 6. Verify write path (optional same session)

- [ ] IA `POST /api/matrix/scout/{grantId}/inbox` with one allowed block type
- [ ] Human **Apply** in `/inbox`

---

## stock-case-cloud.sql — verification status

| Check | Result (2026-07-12) |
|-------|---------------------|
| User certainty | **Unsure** if SQL was run manually |
| Read-only Supabase probe | **CONFIRMED** — `stock_theses`, `market_evidence`, `scoped_ai_grants` tables exist; `trade_plans.stock_thesis_id` column present |
| Row counts (no PII) | 3 profiles, 7 evidence rows, 2 grants |
| End-to-end prod grant GET | **UNCONFIRMED** — not validated with live grant + user this session |

**Interpretation:** Schema appears applied (likely via seed/migration session). Prod grant API still needs user-attention smoke test before unfreezing.

---

## Related docs

- [scoped-ai-access.md](scoped-ai-access.md) — feature design + production status
- [supabase-cloud-first.md](../integrations/supabase-cloud-first.md) — trades/playbooks cloud migration
- [runtime-truth.md](runtime-truth.md) — what works in prod today
- [phases/roadmap.md](../phases/roadmap.md) — phase timeline
