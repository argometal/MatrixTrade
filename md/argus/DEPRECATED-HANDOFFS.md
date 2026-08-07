# Deprecated handoffs (do not use)

**Rule:** Argus architecture, mechanics, and external-AI review material live on **`main`** under `md/argus-review/` and the living Argus library under `md/argus/`.  
If a handoff is not on `main`, it is not the source of truth.

**Canonical starts:**

| Audience | Path |
|----------|------|
| External AI / ChatGPT architecture pack | [`../argus-review/00-PUBLIC-STATUS.md`](../argus-review/00-PUBLIC-STATUS.md) |
| Evidence Engine mechanics (runtime) | [`evidence-engine-mechanics.md`](evidence-engine-mechanics.md) |
| Sealed principles | [`../argus-review/12-evidence-engine-principles-solution.md`](../argus-review/12-evidence-engine-principles-solution.md) |
| Implementation notes | [`../argus-review/13-evidence-engine-implementation.md`](../argus-review/13-evidence-engine-implementation.md) |
| Apps · ARGUS · Forge runtime | [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md) |
| Ops debt (not architecture) | [`../../CHAT-HANDOFF.md`](../../CHAT-HANDOFF.md) |

---

## Deprecated access methods

| Method | Status |
|--------|--------|
| Feature-branch raw URLs (`…/cursor/…/md/…`) | **Deprecated** — connectors often cannot read them |
| Draft PR links / screenshots of links as the handoff | **Deprecated** |
| “Share branch name with IA” without merge to `main` | **Deprecated** |
| Pasting partial docs in chat instead of `main` paths | **Deprecated** for architecture review |

---

## Deprecated / superseded documents

| Document or PR | Why deprecated | Use instead |
|----------------|----------------|-------------|
| Draft PR **#162** + branch `event-topic-signals-metrics-ia-handoff.md` | Branch-only metrics IA handoff; access superseded | `argus-review/00` + Decisions D1–D5 on `main` pack; mechanics in `evidence-engine-mechanics.md` |
| Treating **`11-behavioral-evaluation-review.md`** as live architecture | Historical inventory (pre-implementation) | `12` + `13` + `evidence-engine-mechanics.md` |
| Network **strength%** / org Trust·Future / outcomeScore as current product | Retired in Evidence Engine phases B–C | Status vocabulary + evidence facts |
| Old production-misdiagnosis dumps listed in `IA-HANDOFF.md` | Already marked do-not-revive | `IA-HANDOFF.md` + `current-deploy.md` |
| Legacy journal-first ChatGPT URL tables as primary UX | v2 is primary | `/argus/v2/*` in [`../integrations/argus-chatgpt-handoff.md`](../integrations/argus-chatgpt-handoff.md) |

---

## Still valid (narrow scope — not architecture packs)

| Doc | Scope |
|-----|--------|
| [`export-delivery-handoff.md`](export-delivery-handoff.md) | Deliver / export packages only |
| [`mobile-changes-handoff.txt`](mobile-changes-handoff.txt) | Mobile notes — not EE architecture |
| [`../../CHAT-HANDOFF.md`](../../CHAT-HANDOFF.md) | Live ops debt across MTA / Forge |

---

## Agent rule

1. Prefer `argus-review/` on `main` + `evidence-engine-mechanics.md` over any `*handoff*` dump.  
2. If a handoff contradicts code, **code wins** — fix or deprecate the handoff in the same iteration.  
3. Do not invent a Behavior Engine or new score types to “complete” a deprecated handoff.
