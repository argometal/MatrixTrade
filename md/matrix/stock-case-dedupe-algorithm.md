# Stock-case duplicate cleanup — algorithm (IA + manual)

Use when repeated `stock-case-create` imports created multiple profiles for the same ticker (e.g. 15× MSFT).

## Goal

Keep **one canonical** Stock Profile (+ linked Scout Plan / Evidence). Remove only the duplicate batch — never all rows for a ticker.

## Step 1 — List candidates

**Supabase:**

```sql
SELECT id, ticker, created_at, current_hypothesis
FROM public.stock_theses
WHERE ticker = 'MSFT'
ORDER BY created_at ASC;
```

**Local JSON:** open `data/stock-theses.json`, filter `ticker === "MSFT"`.

## Step 2 — Pick canonical (keep)

Prefer the **first** profile that has a **complete Scout Plan**:

- `plannedEntry`, `stopPrice`, `targetPrice` all present on linked `trade_plans` row
- If none complete → keep the **earliest** `created_at`
- If one was hand-edited and is clearly best → keep that ID explicitly

Record: `CANONICAL_ID = ST-MSFT-00X`

## Step 3 — Mark duplicates (remove)

All other `ST-MSFT-*` from the same incident window (imports within minutes/hours of each other) → `DUPLICATE_IDS`.

**Do not delete** MSFT profiles created on different dates for legitimate re-scouts unless they are clearly the same payload batch.

## Step 4 — Preview impact

For each `DUPLICATE_ID`:

```sql
SELECT COUNT(*) FROM public.market_evidence WHERE stock_profile_id = :id;
SELECT id, planned_entry, stop_price, target_price
FROM public.trade_plans WHERE stock_thesis_id = :id;
```

Or run:

```bash
npx tsx tools/preview-stock-case-dedupe.ts --ticker MSFT
```

## Step 5 — Execute (manual confirmation required)

```bash
npx tsx tools/preview-stock-case-dedupe.ts --ticker MSFT --keep ST-MSFT-001 --execute --confirm YES_DELETE_DUPLICATES
```

Deletes in order: `trade_plans` → `market_evidence` (cascade) → `stock_theses` for each duplicate ID only.

## IA prompt template

```
Task: preview MSFT stock-case duplicates in MatrixTrade Supabase.
1. List stock_theses where ticker=MSFT ordered by created_at.
2. For each id, count market_evidence rows and list trade_plans with entry/stop/target.
3. Recommend CANONICAL_ID (first complete scout, else earliest).
4. List DUPLICATE_IDS to remove.
5. Output SQL preview only — do NOT delete until user confirms.
```

## IA delete (after deploy)

For a single duplicate profile, IA can propose:

```json
{
  "type": "stock-case-delete",
  "proposal": {
    "id": "ST-MSFT-002",
    "confirmDelete": true,
    "reason": "Duplicate from repeated import"
  }
}
```

Human must Validate → Accept in Connect. `confirmDelete: true` is mandatory.

## After cleanup

- Re-run scouting from the canonical profile only.
- New imports are idempotent: same JSON block returns "Already applied" (fingerprint store).
