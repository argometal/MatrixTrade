# AI Trading Session — handoff (AI-1 + AI-2)

## Status: DISABLED — blocked by ChatGPT platform capability, not by MatrixTrade

---

```
------------------------------------------------------------
DISABLED BY DESIGN

This feature was implemented to allow ChatGPT to authenticate
directly against MatrixTrade using temporary AI session tokens.

After validation we confirmed that the current ChatGPT client
cannot initiate authenticated HTTP requests to custom APIs from
this conversation.

Therefore this architecture cannot achieve its intended purpose.

The backend is intentionally disabled rather than extended.

Future work should only resume if ChatGPT (or another supported
AI client) gains native authenticated API access.

Current supported workflow:

MatrixTrade
→ Copy Snapshot
→ ChatGPT
→ Proposal JSON
→ Paste Proposal
→ Inbox
→ Apply

Do not continue implementing AI Session features until this
platform limitation changes.
------------------------------------------------------------
```

**All AI Session issues/tasks:** Blocked by ChatGPT platform capability, not by MatrixTrade.

---

## Supported architecture (unchanged)

| Component | Status |
|-----------|--------|
| Supabase (trades/playbooks) | Active |
| Snapshot generation / Sync | Active |
| Copy Context (AI Workspace) | Active |
| Quick Connect (Worker snapshot URL) | Active |
| Proposal JSON → Inbox | Active |
| Human Apply → Supabase | Active |

---

## What was disabled (code retained, not deleted)

| Item | Path | Notes |
|------|------|-------|
| UI panel | `app/components/ai-workspace/AiSessionPanel.tsx` | Removed from `/ai-workspace` |
| Server actions | `createAiSessionAction`, `revokeAiSessionAction` | Return disabled error |
| API routes | `app/api/ai/*` | Return HTTP 503 |
| Session libs | `lib/ai-session*.ts`, `lib/ai-auth.ts`, etc. | Commented; see `lib/ai-session-disabled.ts` |
| DB schema | `supabase/ai-sessions.sql` | Not required; table optional |

Central guard: **`lib/ai-session-disabled.ts`** (`AI_SESSION_DISABLED = true`).

---

## Original design (reference only)

```
AI Session token → GET /api/ai/* (read) → POST /api/ai/proposals → Inbox → Apply
```

This path is **not viable** as the primary workflow until the AI client can call authenticated custom APIs.

---

## Related docs

- [`supabase-cloud-first.md`](supabase-cloud-first.md)
- [`cloudflare-worker-bridge.md`](cloudflare-worker-bridge.md)
- [`ai-workspace-deeplinks.md`](ai-workspace-deeplinks.md)

**Last updated:** 2026-07-03 (disabled)
