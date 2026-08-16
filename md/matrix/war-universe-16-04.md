# Operational War Universe (PROMPT 16-04)

**Predicate:** `isWarReadyScoutPlan` / `isOperationalWarPlan` in `lib/plan-helpers.ts`.

## Membership (belonging only)

Include iff:

- `status ∈ {watching, ready}`
- no `outcome.recordedAt`
- no `replacedByPlanId`
- confirmed OA not `missed` / `superseded`
- not strategy-review terminal / not learning-sync repair-only

Geometry, proximity, and readiness do **not** decide membership. They only partition Action vs Watch **after** a plan is in the universe.

## Consumers (must use the same function)

Case dropdown (**one option per war-ready plan**, not one per Stock File/ticker) · Compare active scouts · Allocation · Trade prospects · Dashboard/Control active counts · Scout monetary rows · operational snapshots / focus picks that mean open battles.

Same ticker / Stock File may host multiple independent tactical windows (e.g. PLAN-010 and PLAN-012). Selector keys are plan ids (`listScoutWarCases` in `lib/scout-war-cases.ts`).

## Not consumers

Learning queue · Insights LO aggregates · plan-outcome derive · scout-plan-repair linked-active (`entered`) · apply-verify backfill.
