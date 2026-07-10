# MatrixTrade — deferred concepts

**Status:** Concepts only — not runtime truth  
**Last updated:** 2026-07-10  
**Runtime counterpart:** [`architecture/matrixtrade-app.md`](../architecture/matrixtrade-app.md)

---

## 1. MT-PLAN:v1 — structured plans from ChatGPT

ChatGPT responds with a structured plan block; parser creates or updates a `TradePlan` in `/planning`.

| Piece | State |
|-------|-------|
| Planning storage + UI | **Shipped** (Phase 0) |
| Parser + confirm UI | **Deferred** |
| Auto-apply levels | **Never** — user confirms |

See [`planning-module-proposal.md`](../design/planning-module-proposal.md) Phase 1+.

---

## 2. Experiment restart (`experimentId`)

Today: H001–H030 window, `maxTrades` editable on `/system`.  
Future: user starts a new experiment without resetting monthly cap.

| Field | Purpose |
|-------|---------|
| `experimentId` | Tag trades to a cycle (e.g. `EXP-2026-Q3`) |
| ID range config | Not hard-coded H001–H030 |
| Stats reset | Per experiment only |

See [`monthly-risk-vs-experiment.md`](../rules/monthly-risk-vs-experiment.md) §5.

---

## 3. Auto metrics pipeline (Phase 4)

Derive from closed trades + plan outcomes:

- Win rate, expectancy, max drawdown
- Strategy validity rate (plans marked `strategyStillValid`)
- AI batch analysis on failed/expired plan corpus

Output: `metrics/` folder or dashboard section — not yet wired.

---

## 4. AI Session + QR revival

Server actions and API routes exist but `AI_SESSION_DISABLED = true`.  
Revival would restore mobile session pairing — separate from bridge inbox flow.

**Keep concept:** session-based deep links for phone capture.  
**Current path:** `/system#connect` QR + bridge inbox.

---

## 5. Paste AI Notes save UI

`saveAiNotesAction` and `PasteAiNotesPanel` exist but no page mounts the panel.  
Notes today flow into snapshot read-only from Obsidian bodies.

---

## 6. Snapshot copy on New Trade workspace

`/exchange` has full Copy Full Context.  
`/trades-preview` does not — users must switch routes for snapshot export.

**Concept:** embed compact snapshot copy in Trades workspace sidebar.

---

## 7. Monthly risk history chart

Show last 6 months: base cap, carryover in, gross losses used, room at month end.  
Useful for validating carryover logic and `closedAt` bucketing.

---

## 8. Classic ↔ preview runtime toggle

Legacy UI preserved in `app/components/legacy/*` and `(nav)/layout.legacy.tsx`.  
No user-facing toggle to switch shells — preview is the only active shell.

**Concept (optional):** `?classic=1` or System setting to mount legacy components for comparison.  
**Decision:** deprecate, not maintain two live shells long-term.

---

## 9. MATRIX v2 data folders

Repo layout reserves:

```
portfolio/   trades/   companies/   watchlist/
journal/     lessons/  metrics/     research/
```

Most folders are empty placeholders.  
**Concept:** populate from experiment outcomes and Obsidian sync — see [`companies-model.md`](../topics/companies-model.md).

---

## 10. Import handoff (MT-IMPORT:v1)

Full spec: [`protocols/import-handoff-v1.md`](../protocols/import-handoff-v1.md).

```
ChatGPT → MT-IMPORT:v1 block → /import preview → confirm → app + Obsidian
```

Highest-value concept after Planning Phase 1 — closes the ChatGPT loop.
