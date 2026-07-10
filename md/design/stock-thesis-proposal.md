# Stock File — Phase 0 proposal

**Status:** Phase 0 **shipped** (2026-07-10).  
**UI name:** Stock File (code IDs: Stock Thesis, `stock-theses`, `ST-TSLA-001`).  
**Pilot ticker:** TSLA (`ST-TSLA-001`)

---

## Architecture (approved)

Four layers, strict order:

```text
Strategy Playbook (/playbook)  →  HOW to trade (rules, checklist)     [UNCHANGED]
Stock File                   →  WHO is this ticker (profile)        [NEW — code: Stock Thesis]
Scouting Desk (/planning)    →  go / wait / no + tactical scouts    [EXTENDED]
Trade (/trades)              →  WHAT you executed (H00x, P/L)       [EXISTING]
```

| Layer | Route | Storage | Role |
|-------|-------|---------|------|
| Strategy Playbook | `/playbook` | `data/playbooks.json` | Tested strategy rules — not per ticker |
| Stock File | `/stock-theses/[id]` | `data/stock-theses.json` | Strategic memory per ticker |
| Scouting Desk | `/planning` | `data/plans.json` | Tactical scouts linking `stockThesisId` + `playbookId` |
| Trade | `/trades` | Supabase / JSON | Execution record |

**Rule of gold:** Playbook → Stock File → Scouting Desk → Trade. Never reverse.

---

## Stock Thesis entity

| Field | Purpose |
|-------|---------|
| `id` | e.g. `ST-TSLA-001` |
| `ticker` | Uppercase symbol |
| `status` | `draft` · `watching` · `actionable` · `invalidated` · `archived` |
| `version` | Incremented on each save |
| `style` | e.g. `swing` |
| `thesis` | Long-form directional view |
| `historicalAnalysis` | `{ timeframe, summary }[]` |
| `levels` | `majorSupport`, `majorResistance`, zones, `targets` |
| `riskRules` | `minimumRR`, `invalidation`, optional `notes` |
| `currentHypothesis` | Active tactical read |
| `notes` | Freeform |

Plans optionally link via `stockThesisId`. Link validation:

- `watching` / `actionable` — OK
- `draft` — allowed with warning
- `invalidated` / `archived` — blocked

---

## Planning Lab changes (Phase 0)

- Renamed header to **Planning Lab**
- Subheader: Strategy = HOW · Thesis = WHAT · Plan = WHEN/WHERE
- Active thesis panel at top with quick "New plan from thesis"
- Form: Stock Thesis selector (filtered by ticker), Strategy (was Playbook)
- Auto-compute `plannedRR` from entry/stop/target; warn if below thesis `minimumRR`
- Plan list shows linked thesis id with link to detail page
- URL prefill: `/planning?thesis=ST-TSLA-001`

---

## AI snapshot

New section after trade plans:

```text
=== STOCK THESES (AI) ===
active_theses:1
- id:ST-TSLA-001 ticker:TSLA status:watching ...
```

Detail page exposes **Copy AI training block** via `buildStockFileTrainingContext()` (mechanics + file + playbook hint).

---

## Phase 0 scope

### Shipped

- [x] Types, JSON store, TSLA seed fixture
- [x] CRUD + `canLinkThesisToPlan`
- [x] `plan-risk.ts` — `computePlannedRR`, `validatePlanAgainstThesis`
- [x] `stockThesisId` on plans + snapshot wiring
- [x] Planning Lab UI + Stock Thesis detail page
- [x] `saveStockThesisAction` (status, hypothesis, notes MVP edit)

### Out of scope (Phase 1+)

- Supabase migration for `stock_theses` table
- Full thesis CRUD form (levels, historical analysis editor)
- Nav item for Stock Theses list (discoverable via Planning panel for MVP)
- Market data / auto-invalidation
- AI block import for theses (`MT-THESIS:v1`)

---

## Files

| Path | Role |
|------|------|
| `lib/stock-thesis-types.ts` | Types + labels |
| `lib/stock-theses-store/` | JSON persistence |
| `lib/stock-theses.ts` | CRUD + link validation |
| `lib/stock-thesis-snapshot.ts` | Snapshot + context text |
| `lib/plan-risk.ts` | R:R compute + thesis validation |
| `data/stock-theses.json` | Seed data |
| `app/(trading)/(preview)/stock-theses/[id]/page.tsx` | Detail route |
| `app/components/stock-thesis-preview/PreviewStockThesis.tsx` | Detail UI |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-10 | Phase 0 shipped — Stock Thesis + Planning Lab integration |
