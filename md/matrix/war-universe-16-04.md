# Operational War Universe (PROMPT 16-04)

## A-Iteration

User-defined rules are primary.
This Library MD is the source of A-Iteration Anchors for its scope.
A-Iteration Anchors preserve the user's exact words.
AI never rewrites or reinterprets them.
If conflict or ambiguity exists, AI must negotiate with the user.
Respect ontology. Do not invent.
Only present what canonically exists in the epistemology.
If the required epistemology does not exist, do not add it; stop and report it.
Never change a user-defined A-Iteration rule.
Preserve A-Iteration Anchors.
Preserve what works.
Change only what is necessary.
Do not fix what does not block.
Verify the result.


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
