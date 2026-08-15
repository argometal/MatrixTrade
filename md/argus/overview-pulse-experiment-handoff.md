# Overview as operational cover (pulse experiment → proposal)

**Status:** experiment shipped · **IA reading accepted** · proposal for discussion (not implemented)  
**Audience:** product / architecture IA + implementers  
**Related pin:** pulse experiment landed under `main0814h`; current prod pin may be newer — see [`../integrations/current-deploy.md`](../integrations/current-deploy.md)

---

## IA reading (locked direction)

Overview has product value **only if it stops competing with Timeline / Tags / Links**.

The pulse experiment already aims at the right job:

> Answer quickly: **what is this binder, and how alive is it?**  
> Evidence · graph composition · patterns · activity.

**Direction:**

| Do | Don’t |
|----|--------|
| Pulse first | More metrics / KPI cards |
| Chips secondary and more compact | Mini ego-graph on Overview (Links/Neighborhood already own that) |
| Operational cover page | Second dashboard |
| One Open-work CTA when something is actionable | Multi-widget attention strip |
| Event evidence donut = inspect-only for now | Chronicle sticky peek (later, if ever) |

Compared with Portfolio: **Overview can become the useful cover of each Org/Project**; Graph stays the deep structural tool.

---

## Answers to the three experiment questions

1. **Pulse primary, chips secondary** — yes. First viewport = pulse composition; chips demote to compact secondary / migrate toward Quick links.  
2. **Topic Event donut** — stay **inspect-only** on Links. No Chronicle sticky yet.  
3. **Next experiment** — a **single Open-work CTA**, not more visualizations.

---

## Target composition (ideal cover)

```
OVERVIEW
┌─────────────────┬─────────────────┬─────────────────┐
│  Evidence mix   │   Graph mix     │    Activity     │
│  (donut)        │  (donut)        │  (sparkline)    │
└─────────────────┴─────────────────┴─────────────────┘
Patterns
  · complacency · planning · handover   (recurring tags → Tags)
Open work
  1 concise CTA  — only if something actually needs attention
Quick links
  Topics · Events · People · Tags
```

**Jobs of each band**

| Band | Job | Competing surfaces |
|------|-----|--------------------|
| Evidence / Graph / Activity | “What is it / how alive?” | Not Timeline (detail) |
| Patterns | Recurring language on evidence | Tags tab (full manage) |
| Open work | “Estado + siguiente cosa importante” | Relationship aside / Runbooks tab (lists) |
| Quick links | Jump into work surfaces | Chip grid / Browse |

**Keep from the current experiment (highest value):**

- Evidence donut  
- Graph binders donut  
- Recurring patterns  
- Project activity sparkline (extend Org Activity slot for parity)

**Do not add yet:** ego mini-graph, extra metric rings, Home-style attention chip rows, Forge 3D / realm graph.

---

## Next experiment (scoped)

### Single Open-work CTA

**Goal:** turn Overview from “pretty summary” into **status + next important thing** without becoming a dashboard.

**Rule:** at most **one** line. If nothing qualifies → **omit the band** (no empty “All clear” chrome).

**Priority synthesizer (reuse existing signals only — no new metrics):**

1. **Pending follow-up(s)** scoped to the binder  
2. Else **open runbook check(s)** on entity-scoped progress  
3. Else **relationship attention** (dormant / cooling) — light copy, not a health score  
4. Else hide

**CTA shape:** one sentence + one destination (`?tab=…`, person/Network, Runbooks). Copy helpers already exist (`HOME_DETAIL.followUpPending` in `lib/argus/ux-copy.ts`).

**Explicit non-goals for this experiment:**

- No second CTA, no ranked list, no Needs Attention board  
- No new analytics fields  
- No mini-graph  
- No Event Chronicle sticky  

---

## Reuse inventory (MatrixTrade monorepo)

> **Repos note:** This cloud environment only has **`github.com/argometal/MatrixTrade`**. There is no separate Matrix / Forge / trading repo checkout. “Otros repos de Matriz” in practice = **surfaces inside this monorepo** (ARGUS · ArgusForge · MTA trading). Steal **patterns**, not business logic across product boundaries (`md/integrations/argus-architecture.md`).

### A. Already on Overview — extend, don’t reinvent

| Piece | Where | Proposal use |
|-------|--------|--------------|
| Evidence / graph donuts | `lib/argus/v2/evidence-mix.ts`, `V2EvidenceMixDonut` | Keep as primary pulse columns |
| Overview shell | `V2OverviewBinderPulse` | Add Activity slot parity (Org), Open work, Quick links; pulse-first layout |
| Patterns | `buildTagPatternsForScope`, `V2TagPatternBadges` | Keep **one** Patterns band (drop header duplicate if still double-rendered) |
| Activity sparkline | `buildMonthlyActivitySparkline`, `V2RelationshipChart` | Project: already in pulse · Org: promote into pulse Activity (aside can stay thinner) |
| Org/Project shells | `V2OrgShell`, `V2ProjectShell` | Demote chip grid; wire CTA + Quick links |
| Page data | `organizations/[id]/page.tsx`, `projects/[id]/page.tsx` | Feed CTA from props already loaded |

### B. ARGUS elsewhere — good candidates for Open work

| Piece | Where | Steal |
|-------|--------|-------|
| Follow-up counts / next | `buildEntityIntelligence` → `openFollowUps`, `nextFollowUp`; Home `buildV2FollowUps` | **Logic** for Org CTA; do **not** mount Home follow-up list |
| Runbook open checks | `runbook-helpers` (`runbookProgress`, `isRunbookCheck`); Project Overview already sums `runbookOpen`; Home `home-runbook-access` open-check idea | Entity-scoped open count → CTA → Runbooks tab |
| Relationship attention copy | `NetworkContactShell` `AttentionPanel` + `deriveRelationshipAttention` / `attentionSummaryMessage` | **Best UX analogue** for one actionable sentence |
| Chip deep-links | Existing Org/Project chip `href`s / tab setters | Become Quick links vocabulary |
| Home attention pattern | `V2HomePulse` / `V2HomeAttentionActions` | Idea only: “show CTA if needed” — **not** multi-chip row |

### C. Same monorepo, other products — pattern only

| Surface | Where | What to steal | What not to import |
|---------|--------|---------------|---------------------|
| MTA Needs Attention | `lib/dashboard-attention.ts` → `buildAttentionItems`; `NeedsAttentionRow` | Priority → **one** Go CTA | Trading tasks / inbox snapshots |
| Situation Room | `SituationRoomDashboard` (“Operational attention only”) | Cover = status + next action | Trading domain chrome |
| Forge MTA Active | `MtaScopedPanel` Needs attention → Situation Room | Link-card “status → action” | Forge store / MTA coupling |
| ArgusForge graphs | `/forge/argus/units`, realm React Flow | Ideas only (ego focus, weighted links) — already noted in `intelligence-viz-plan.md` | **Do not copy Forge graph code into Argus Overview** |

### D. Explicitly do **not** put on Overview

| Avoid | Why |
|-------|-----|
| Ego / neighborhood mini-graph | Duplicates Links / Neighborhood |
| Home Treemap / Portfolio / Tags lens | Wrong surface; dashboard gravity |
| Full follow-up or runbook lists | Home / tabs own lists; cover wants one CTA |
| Revived Project “Key metrics” / dense chip KPIs | Competes with pulse |
| Trading `buildAttentionItems` data | Wrong product boundary |

---

## Layout migration sketch (implementation later)

1. **Pulse first** — Evidence | Graph | Activity on one row (stack on mobile).  
2. **Patterns** — single band under pulse.  
3. **Open work** — thin synthesizer (next experiment).  
4. **Quick links** — Topics · Events · People · Tags (compact text/row, not card grid).  
5. **Chips** — shrink or fold into Quick links / aside; stop owning the first viewport.  
6. Topic Event donut — unchanged (inspect-only).

No calendar-time estimate — scope is UI composition + one synthesizer over **existing** loader fields.

---

## Code map (current experiment)

| Piece | Path |
|-------|------|
| Mix helpers | `lib/argus/v2/evidence-mix.ts` |
| Donut | `app/argus/v2/components/V2EvidenceMixDonut.tsx` |
| Overview pulse | `app/argus/v2/components/V2OverviewBinderPulse.tsx` |
| Org/Project shells | `V2OrgShell.tsx`, `V2ProjectShell.tsx` |
| Topic Event inspect | `browse/topics/components/V2TopicDetailPanel.tsx` |
| Smoke | `tools/test-evidence-mix.ts` |

**Likely touch for Open-work experiment:** `V2OverviewBinderPulse` (+ thin `lib/argus/v2/overview-open-work.ts` synthesizer), Org/Project pages/shells, optional reuse of `attentionSummaryMessage` / runbook open sum.

---

## Discussion asks (for IA / owners)

1. Confirm **Open-work priority order**: follow-ups → runbook open → relationship attention → hide. Any binder-specific override (e.g. Project prefers runbook first)?  
2. Quick links: **always show**, or only when pulse has content?  
3. Org Activity: move sparkline into pulse (parity with Project) and thin the Relationship aside — OK?  
4. Outside MatrixTrade: if another Matriz repo should be inventoried for cover patterns, name it — this handoff could only see the monorepo surfaces above.

---

## Deferred (still parked)

| Idea | Status |
|------|--------|
| Ego neighborhood miniature on Overview | **Rejected for now** (duplication) |
| Topic Event Chronicle sticky peek | Parked; inspect-only remains |
| URL `?event=` for Topic inspect | Optional later |
| Shared donut on Topic Chronicle header | Parked (chrome density) |
| More Overview visualizations | **Out** — next work is Open-work CTA only |
