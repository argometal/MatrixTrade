# AI Workspace — deep links research

**Status:** Research only (2026-07-03). No unsupported integrations implemented.

MatrixTrade uses **AI Workspace** as a provider-neutral surface. This document covers what is technically possible today for connecting external assistants (ChatGPT, Claude, etc.) without manual URL/token handling from the user.

---

## 1. Official deep link to pre-fill a prompt?

### ChatGPT (web)

| Mechanism | Supported? | Behavior |
|-----------|------------|----------|
| `https://chatgpt.com/?q={url-encoded-text}` | **De facto, not formally documented as API** | Opens ChatGPT web; **pre-fills the composer** with `q`. User must press Send. |
| `https://chatgpt.com/?model=gpt-4o&q={text}` | Same | Also selects model in URL (behavior may change). |
| `?prompt=` variant | **Unstable** | Community reports `prompt` replacing `q` in some app contexts; not reliable cross-platform. |

**Not supported:**

- Passing a **remote snapshot URL** for ChatGPT to fetch automatically via query param alone (ChatGPT must use browsing/connectors or user paste).
- **Auto-submit** the prompt from URL (by design — see Microsoft security notes on `?q=` prompt injection, 2026).
- Continuing an **existing conversation** with `?q=` on a `/c/{id}` URL — community reports inconsistent results.

### Claude, Gemini, others

| Product | Pre-fill URL pattern | Auto-send |
|---------|---------------------|-----------|
| Claude | `https://claude.ai/new?q={text}` (reported) | No |
| Copilot | `https://copilot.microsoft.com/?q={text}` | No |
| Perplexity | `https://perplexity.ai/search?q={text}` | Varies |

**Conclusion:** Pre-fill via URL query param is a **real but informal** capability on several web assistants. It is **not** a stable cross-vendor API. MatrixTrade should treat it as **optional future enhancement**, not core flow.

---

## 2. Can a QR open the ChatGPT app on iOS/Android?

| QR content | Phone behavior |
|------------|----------------|
| `https://matrixtrade-bridge.../snapshot?token=...` | Opens **browser** → raw JSON. Does **not** open ChatGPT app. Correct for reading snapshot on phone. |
| `https://chatgpt.com/?q=...` | Opens **browser** (or may offer Open in app). Does **not** guarantee native app handoff. |
| `com.openai.chat://chatgpt.com/...` | **Unofficial** URL scheme. Shortcuts can launch app + pre-fill; **does not auto-send** (OpenAI community, 2025–2026). |

OpenAI feature request ([community](https://community.openai.com/t/support-custom-url-schemes-or-intent-handlers-to-trigger-specific-behaviors-in-the-chatgpt-mobile-app/1255168)): custom URL schemes for mobile app — **not officially supported** as of research date.

**Conclusion:** QR should encode the **Worker snapshot URL** for data access. A separate QR for “open assistant” is possible but opens web/app inconsistently and cannot pass snapshot fetch without connectors or paste.

---

## 3. Best real alternative (no invented solutions)

### Current MatrixTrade flow (implemented)

```text
System → Sync to Worker
AI Workspace → Copy Snapshot URL (full URL, token included)
           → Show QR (same Worker URL)
           → Open Assistant (web entry point)
           → Copy Context (paste handoff)
Review → Inbox → Apply
```

### Why this works

1. **Snapshot URL** — one copy action; ChatGPT reads via browsing or user shares URL in chat.
2. **Worker bridge** — ChatGPT POSTs proposals to `/inbox`; user Apply locally.
3. **Copy Context** — fallback when assistant has no live URL access (paste packet).
4. **GitHub connector** (optional, user-configured in ChatGPT) — reads repo docs; separate from MatrixTrade UI.

### What NOT to build yet

- Fake “one-click analyze” that assumes ChatGPT fetches snapshot without user action.
- Mobile deep link that auto-sends prompts.
- Embedding READ_TOKEN in assistant memory via URL (security risk).

---

## 4. Future design (prepared, not implemented)

When/if user opts into a specific assistant:

```typescript
// lib/ai-workspace.ts — stub for future use
function buildAssistantEntryUrl(provider: "web-default", stubInstructions: string): string {
  // Web only: pre-fill composer, user sends manually
  return `https://chatgpt.com/?q=${encodeURIComponent(stubInstructions)}`;
}
```

Stub instructions would include:

- Snapshot URL (after sync)
- Snapshot revision
- One-line task (“Analyze H001–H030 experiment…”)

**Gate:** Feature flag + user consent; document that `?q=` does not auto-run and may change.

---

## 5. Architecture decision

| Layer | Role |
|-------|------|
| **AI Workspace** | User-facing connect + handoff + inbox (no vendor name in UI) |
| **System** | Bridge sync, tokens status, phone LAN, Obsidian paths |
| **Worker** | Snapshot read + inbox write (vendor-agnostic JSON API) |

Provider choice stays **outside** MatrixTrade core UI.
