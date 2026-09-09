# Learning Outcome durable store (CURSOR-MTA-LEARNING-OUTCOME-DURABLE-STORE-001)

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


## Backend selection

| Context | Store |
|---------|--------|
| Test override | memory |
| `isSupabaseMatrixStore()` / Vercel | Supabase `public.learning_outcomes` |
| Local default | `data/learning-outcomes.json` |

Forced via `LEARNING_OUTCOMES_STORE=json|supabase|memory` (json forbidden on Vercel).

No silent production fallback from Supabase → JSON.

## Required SQL

Run once in Supabase SQL Editor:

`supabase/learning-outcomes.sql`

## Migration

```bash
npm run migrate:learning-outcomes-to-supabase          # dry-run
npm run migrate:learning-outcomes-to-supabase -- --apply
```

Never deletes the JSON file. Compares `updatedAt` before overwriting newer remote rows.

## Diagnostics

```bash
npm run diagnose:learning-outcomes
```

Read-only. Repair plan outcomes via Planning → **Retry Learning Sync**.

## Sync integration

`syncPlanOutcomeLearning` unchanged in contract: LO/OBS verify → `learningSyncStatus=complete`; LO write failures → `failed` + repair attention.
