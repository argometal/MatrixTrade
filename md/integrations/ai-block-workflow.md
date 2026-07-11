# AI Block workflow

**Status:** Active — the only supported AI workflow in MatrixTrade.

---

## Flow

```
/ai-bridge → Copy Snapshot
  → paste in AI assistant
  → receive AI Block (JSON)
  → Paste AI Block → Import AI Block
  → /inbox → Review → Apply → Supabase
```

No QR. No AI Session tokens. No direct API from ChatGPT.

---

## Snapshot sections

- `=== MATRIX ===` — version, generated, revision
- `=== EXPERIMENT ===` — cycle, loss budget, W/L
- `=== OPEN TRADES ===`
- `=== PENDING ORDERS ===`
- `=== CLOSED SIN REVIEW ===`
- `=== PLAYBOOK ===`
- `=== AI NOTES (PRIOR) ===` — saved notes for comparison
- `=== SYSTEM ===` — store mode, bridge, inbox backend
- `=== REQUEST ===` — AI Block format instructions

---

## AI Block format

Plain JSON or a single fenced block:

```json
{
  "type": "trade-proposal",
  "proposal": {
    "id": "H00X",
    "ticker": "TICKER",
    "entry": 175.5,
    "stop": 170,
    "shares": 10
  }
}
```

Supported types: `trade-proposal`, `trade-close`, `trade-review`, `analysis`.

Import validates with existing `lib/bridge.ts` rules. **Never auto-applies.**

### Protocol examples

**Create pending trade** (planned entry — default when `status` omitted):

```json
{
  "type": "trade-proposal",
  "proposal": {
    "id": "H002",
    "ticker": "GOOGL",
    "entry": 175.5,
    "stop": 170,
    "shares": 10,
    "status": "pending"
  }
}
```

**Create already-open trade** (broker position filled before MatrixTrade record):

```json
{
  "type": "trade-proposal",
  "proposal": {
    "id": "H002",
    "ticker": "GOOGL",
    "entry": 175.5,
    "stop": 170,
    "shares": 10,
    "status": "open"
  }
}
```

**Close open trade**:

```json
{
  "type": "trade-close",
  "proposal": {
    "id": "H001",
    "exit": 108.5
  }
}
```

**Close externally executed pending trade** (record created as pending but broker already closed):

```json
{
  "type": "trade-close",
  "proposal": {
    "id": "H002",
    "exit": 172.25,
    "confirmExternalClose": true
  }
}
```

If `trade-close` targets a pending trade without `confirmExternalClose: true`, Apply is blocked with:

`Trade H002 is pending, not open. Open it first or use confirmExternalClose.`

---

## Inbox storage (production)

Priority on import:

1. **Worker inbox** (if `BRIDGE_WRITE_TOKEN` configured)
2. **Supabase** `trading_inbox` table (production fallback)
3. **Local file** `data/trading-inbox.json` (dev only)

Run in Supabase SQL Editor:

```
supabase/trading-inbox.sql
```

Also run `supabase/ai-notes.sql` if using prior AI notes in snapshots.

---

## Done criteria

User can paste one valid `trade-proposal` AI Block → see it in `/inbox` → Apply → trade in Supabase.

---

## Disabled paths

- AI Session / QR / `/api/ai/*` — see `lib/ai-session-disabled.ts`

**Last updated:** 2026-07-03
