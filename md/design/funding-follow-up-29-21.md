# Assisted Scout funding follow-up (29-21)

## 1. Diagnosis
Operational GOOGL · PLAN-007 required two separate Apply cycles (`decision-update` then manual `capital-reservation-create`). After accepting the Scout update, the user had to reopen Funding Snapshot, re-copy schema contracts, re-request JSON, and Accept reservation separately — repeating identifiers and monetary derivation.

Scout and Capital layers remain separate; the gap was assisted handoff, not domain merging.

## 2. Options

| Option | Verdict |
|---|---|
| A — Assisted sequence | Partial — good UX once triggered; needs post-Accept authoritative state |
| B — Composite / transactional Apply | **Deferred** — Apply engine is single-op; no transactional multi-op or rollback across `decision-update` + `capital-reservation-create`. Simulating atomicity would leave ambiguous partial state |
| **C — Post-Accept proposal assist** | **Selected** (+ Prepare Funding JSON assisted sequence) |

## 3. Selected architecture (Option C + assisted sequence)
After successful Accept of a qualifying `decision-update`:

1. Server reloads accepted persisted Scout
2. Server derives Funding Snapshot (existing monetary / capital models)
3. Returns `fundingFollowUp` on Accept result
4. UI shows Funding readiness panel
5. User confirms → **Prepare Funding JSON** (fills Control paste)
6. Control → Apply → Validate → Accept remains mandatory

No automatic capital mutation. Prepared proposal ≠ reserved capital.

## 4. Domain
- `lib/scout-funding-follow-up.ts` — fingerprint, eligibility, expiration policy, stale detection, readiness model, suggested `capital-reservation-create` block
- Reuses Scout Funding Snapshot, capital account, layered-entry monetary projections, reservation validation
- Stale = fingerprint mismatch on active reservation (legacy without fingerprint: never auto-staled)
- Active reservation (including stale) blocks prepare until release — no duplicate actives

## 5. Schema
Prefer extend existing contracts:
- Accept/`decision-update` result: `fundingFollowUp?: { eligible, reason?, planId, fundingFingerprint?, readiness?, suggestedBlock? }`
- `capital-reservation-create` optional provenance: `fundingFingerprint`, `sourcePlanUpdatedAt`, `sourceDecisionUpdateId`

## 6. Migration
1. Nullable provenance fields
2. Existing reservations = legacy provenance (readable)
3. Do not mass-mark stale
4. Fingerprints only on new assisted reservations
5. No automatic reservation creation during migration

## 7. Atomicity / Option B future path
Documented only after: transactional multi-op support, rollback semantics, post-update validation, dual-op audit logs. Do not simulate atomic behavior today.

## 8. Known limitations
- Expiration uses Scout `validUntil` only; free-form confirmation UI is future work (never invent)
- Stale is derived UI/domain state via fingerprint (status enum unchanged — no silent reservation mutation)
- Allocation Board “prepared proposal” surface deferred if Allocation Board not on this branch/main
- Fingerprint uses browser-safe deterministic digest (ScoutExecutePanel is client)
