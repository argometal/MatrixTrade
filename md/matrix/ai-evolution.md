# Matrix AI evolution — protocol over provider

**Status:** Phase C (2026-07-10).  
**Rule:** Matrix stays "dummy" (no paid API integration) until the scout loop proves value on TSLA.

---

## Philosophy

Matrix does not need to *be* an AI app. It needs a **communication protocol** that any chat assistant can follow:

```text
Scoped link or Copy package → external AI → ONE block → Inbox → human Apply
```

Evolution is **data + block types + context richness** — not marrying OpenAI, Anthropic, or a single SDK.

---

## Low-budget rules

| Do | Don't |
|----|-------|
| Extend `lib/ai-context.ts` + inbox block types | Add OpenAI/Anthropic API calls |
| Temporal scoped grants (24h, one stock, optional one PLAN) | Build a chat UI inside Matrix |
| Append-only decisions, evidence, assessments | Auto-apply AI proposals |
| Copy/paste + HTTP context/inbox for any AI | Parallel export pipelines |

**Spend on APIs later** only when: TSLA loop is habitual, inbox Apply is trusted, and a specific automation (e.g. nightly evidence digest) has a measured ROI.

---

## Phase C additions

- **`decision-update`** — canonical path for scout verdict on a `PLAN-xxx` (wait / probe / go / no + confidence + challenges).
- **Probe** — planning artifact only; authorize → activate → convert|cancel|stop; no trade creation.
- **Plan-scoped grants** — optional `planId` on `GRANT-xxx` so AI sees one scout episode + current decision/probe state.

`scout-assessment` still appends to Stock File notes; use **`decision-update`** when the AI is deciding on a specific scout plan.

---

## TSLA pilot loop (any AI)

1. Open `/planning` → select **PLAN-001** (TSLA) → **Create scout AI link** (or Stock Profile link with `planId`).
2. Share `/scout-access/{grantId}` or fetch `GET /api/matrix/scout/{grantId}` in your AI.
3. AI returns one block: `evidence-add`, `file-update`, `scout-assessment`, or **`decision-update`**.
4. POST to inbox URL → **Apply** in `/inbox`.
5. Decision appears on plan; probe authorized if verdict = probe.

---

## When to add real AI (Phase E+)

Consider paid APIs only for:

- High-volume evidence normalization (if manual paste fails)
- Batch missed-scout review (Phase D learning corpus)
- Coach readouts (Statistics + Learning engines)

Until then: **provider-agnostic links + inbox Apply** are the product.

---

## Related

- [scoped-ai-access.md](scoped-ai-access.md)
- [ai-engineering.md](ai-engineering.md)
- [scout-execution-model.md](scout-execution-model.md)
