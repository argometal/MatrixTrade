# Argus / MatrixTrade — Page identity codes

**Purpose:** When reporting a UI bug from phone or web, cite the code in the top bar (e.g. `A06 · Topics`) so the agent knows the exact screen.

## Convention

| Piece | Rule |
|-------|------|
| Prefix | `A` = Argus, `M` = MatrixTrade (trading) |
| Number | Two digits, stable once assigned — do not reuse |
| Label | Short English name of the screen |
| Display | `A06 · Topics` in top bar (mono, small, always visible) |
| Resolution | Client maps `pathname` → code (no server round-trip) |

Prefer short codes over long hex. Hex is hard to read aloud and mistype on mobile.

## Argus catalog (implemented)

| Code | Label | Path |
|------|-------|------|
| A01 | Home | `/argus/v2` |
| A02 | Inbox | `/argus/v2/inbox` |
| A03 | Organizations | `/argus/v2/browse/organizations` |
| A04 | Projects | `/argus/v2/browse/projects` |
| A05 | People | `/argus/v2/browse/network` |
| A06 | Topics | `/argus/v2/browse/topics` |
| A07 | Events | `/argus/v2/browse/events` |
| A08 | Org detail | `/argus/v2/organizations/[id]` |
| A09 | Project detail | `/argus/v2/projects/[id]` |
| A10 | Person detail | `/argus/v2/network/[id]` |
| A11 | Runbook | `/argus/v2/runbooks/[id]` |
| A12 | Export | `/argus/v2/deliver` |
| A13 | Diagnostics | `/argus/v2/diagnostics` |
| A14 | Help | `/argus/v2/help` |
| A15 | Search | `/argus/search` |
| A00 | Argus | fallback |

## Code locations (Argus)

- Registry: `lib/argus/v2/page-ids.ts`
- Badge: `app/argus/v2/components/V2PageIdBadge.tsx`
- Mounted in: `app/argus/v2/components/V2TopBar.tsx` (next to build SHA)

## Port to MatrixTrade

1. Add `lib/matrix/page-ids.ts` (or `lib/trading/page-ids.ts`) with prefix **`M`**.
2. Suggested catalog:

| Code | Label | Typical path |
|------|-------|--------------|
| M01 | Home / Control | `/` or home-preview |
| M02 | Trades | `/trades` / trades-preview |
| M03 | Trade detail | `/trades/[id]` |
| M04 | New trade | `/trades/new` |
| M05 | Inbox | `/inbox` |
| M06 | Review | `/review` |
| M07 | Stats | `/stats` |
| M08 | Planning | `/planning` |
| M09 | Mistakes | `/mistakes` |
| M10 | Exchange | `/exchange` |
| M11 | System | `/system` |
| M12 | Stock thesis | `/stock-theses/...` |
| M00 | Matrix | fallback |

3. Add `MatrixPageIdBadge` (same UI as Argus) into the trading top bar / preview chrome.
4. Keep build SHA badge separate (commit identity ≠ page identity).
5. When filing bugs: “**M05 · Inbox** — Connect overlaps body” style reports.

## Related UX fixes shipped with this

- Topics **Date** filter: Last 7 / 30 / 90 days, Older than 90 (`?activity=`)
- Activity labels: relative only for ≤7 days; calendar date after that
