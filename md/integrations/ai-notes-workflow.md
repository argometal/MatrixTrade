# AI Notes workflow

**Status:** Active — copy/paste only (no AI Session, no QR, no direct API from ChatGPT).

---

## Flow

```
AI Workspace → Copy Sectioned Snapshot
  → Paste in AI assistant (ChatGPT, etc.)
  → AI returns JSON notes
  → Paste AI Notes in MatrixTrade
  → Notes stored (linked to snapshot_revision)
  → Next sectioned snapshot includes === AI NOTES (PRIOR) ===
```

Proposals with `proposal_json` are stored on the note only. To apply trades, paste the proposal separately into **Inbox** (unchanged path).

---

## Sectioned snapshot format

```
=== MATRIX ===
=== EXPERIMENT ===
=== OPEN TRADES ===
=== PENDING ORDERS ===
=== CLOSED SIN REVIEW ===
=== PLAYBOOK ===
=== AI NOTES (PRIOR) ===
=== REQUEST ===
```

---

## Paste JSON schema

```json
{
  "notes": [
    {
      "note_type": "analysis",
      "trade_id": "H001",
      "body": "Required text.",
      "proposal_json": { "type": "trade-review", "proposal": {} },
      "date": "2026-07-03T12:00:00Z"
    }
  ]
}
```

| Field | Required | Values |
|-------|----------|--------|
| `note_type` | Yes | `analysis` \| `risk` \| `strategy` \| `lesson` \| `action` |
| `body` | Yes | string |
| `trade_id` | No | e.g. `H001` |
| `proposal_json` | No | inbox-shaped object |
| `date` | No | ISO 8601 (defaults to save time) |

`snapshot_revision` is set from the current revision when you save (not from pasted JSON).

---

## Storage

| Mode | Location |
|------|----------|
| Local (`TRADES_STORE=json`) | `data/ai-notes.json` |
| Supabase | `public.ai_notes` — run `supabase/ai-notes.sql` |

---

## Related

- [`ai-trading-session-handoff.md`](ai-trading-session-handoff.md) — AI Session path (disabled)
- [`cloudflare-worker-bridge.md`](cloudflare-worker-bridge.md) — Worker snapshot / inbox

**Last updated:** 2026-07-03
