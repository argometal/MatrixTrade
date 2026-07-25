# Legacy absence FK fix — Prompt 25-F8

**Status:** Shipped in code · **requires** Supabase SQL once.  
**Date:** 2026-07-25

## Problem

Apply JSON correctly used:

```json
"playbookId": "__legacy_none__",
"planId": "__LEGACY_NONE__"
```

Persistence wrote those strings into `trades.playbook_id`, which has FK → `playbooks(id)`. Upsert failed.

## Fix

1. Apply still accepts the sentinels (contract unchanged for the AI).
2. Server normalizes before write:
   - `playbook_id = null` + `playbook_historically_absent = true`
   - `plan_id = null` + `plan_historically_absent = true`
3. Gap detector (`assessTradeLegacy` / incomplete-closed) treats the flags as complete even when FK columns are null.
4. `null` / omit / `__none__` still leave the gap open.

## Ops — run once in Supabase SQL Editor

```text
supabase/trade-legacy-absence.sql
```

Without this migration, upserts may succeed with `playbook_id=null` but **flags will not persist**, so Needs Attention can stay open.

## Code

| Piece | Path |
|-------|------|
| Normalize + gap helpers | `lib/legacy-trade-completion.ts` |
| updateTrade / createTrade | `lib/storage.ts` |
| Row mapping | `lib/trades-store/mapping.ts` |
| SQL | `supabase/trade-legacy-absence.sql` |
| Test | `npm run test:legacy-trade-completion` |
