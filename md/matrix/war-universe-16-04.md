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

Case dropdown · Compare active scouts · Allocation · Trade prospects · Dashboard/Control active counts · Scout monetary rows · operational snapshots / focus picks that mean open battles.

## Not consumers

Learning queue · Insights LO aggregates · plan-outcome derive · scout-plan-repair linked-active (`entered`) · apply-verify backfill.
