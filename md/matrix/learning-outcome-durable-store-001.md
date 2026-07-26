# Learning Outcome durable store (CURSOR-MTA-LEARNING-OUTCOME-DURABLE-STORE-001)

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
