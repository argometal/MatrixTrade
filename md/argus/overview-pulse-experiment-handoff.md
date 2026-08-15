# Overview pulse + Topic Event quick view (experimental)

**Status:** shipped experiment · for IA analysis  
**Audience:** product / architecture IA reviewing ARGUS binder UX  
**Production pin:** `main0814h` @ `f99defd` — see [`../integrations/current-deploy.md`](../integrations/current-deploy.md)

---

## Problem

1. **Topic → Event select** only showed name/date/tags + “Open Event”. No at-a-glance composition of that Event’s evidence.
2. **Organization / Project Overview** tabs were underused: chips + aside rails, empty main column. Timeline / Tags / Links already carry the useful work.

## Experiment shipped

### A. Topic Event quick view (donut)

On Topic **Links**, click an Event → inspect slot adds an **evidence mix donut**:

| Slice | Meaning |
|-------|---------|
| Notes | Logs linked to the Event |
| Emails | Inbox linked to the Event |
| Event tags | Binder `eventTags` |
| Note tags | Tags on that Event’s notes/emails |

Center shows note+email total when &gt; 0. Still opens full Event for Chronicle.

### B. Org / Project Overview pulse

Main Overview column (below chips) gets **`V2OverviewBinderPulse`**:

- **Evidence donut** — notes vs emails in scope  
- **Graph binders donut** — people / topics / events  
- **Recurring tag patterns** (when present) with jump to Tags  
- Project also keeps a 12‑month activity sparkline in the pulse  
- Removed redundant Project “Key metrics” card (duplicated chips)

One composition: “what is this binder made of / is it alive?” — not a second dashboard.

---

## Ideas deferred (for IA)

| Idea | Why interesting | Risk |
|------|-----------------|------|
| Ego neighborhood miniature on Overview | Graph story without opening Links | Visual weight / mobile |
| Open-work hook (follow-ups / runbook open items) as single CTA line | Workflow, not vanity KPIs | Overlap with Relationship status |
| URL `?event=` for Topic inspect | Shareable quick view | State sync with Links tab |
| Shared donut for Topic binder itself (Chronicle header) | Parity with Event inspect | Clutter on already-dense topic chrome |
| Replace chip grid with pulse-first Overview | Stronger first viewport | Loses deep-link chip habit |

---

## Code map

| Piece | Path |
|-------|------|
| Mix helpers | `lib/argus/v2/evidence-mix.ts` |
| Donut | `app/argus/v2/components/V2EvidenceMixDonut.tsx` |
| Overview pulse | `app/argus/v2/components/V2OverviewBinderPulse.tsx` |
| Org/Project shells | `V2OrgShell.tsx`, `V2ProjectShell.tsx` |
| Topic Event inspect | `browse/topics/components/V2TopicDetailPanel.tsx` |
| Per-event counts | `topic-loaders` → `eventEvidenceTags.noteCount/emailCount` |
| Smoke | `tools/test-evidence-mix.ts` |

---

## Ask for IA

1. Is **Overview pulse** the right first viewport for Org/Project, or should chips shrink and pulse become primary?  
2. Should Topic Event quick view stay **inspect-only**, or promote to a sticky peek on Chronicle when an Event chip is clicked?  
3. Which deferred idea should land next without turning Overview into a dashboard?
