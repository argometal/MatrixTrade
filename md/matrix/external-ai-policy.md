# External AI policy

**Status:** Canonical (2026-07-11).  
**Applies to:** MatrixTrade product copy, library docs, UI strings, AI packages, and architecture descriptions.

---

## Vendor-neutral language

MatrixTrade is **not** tied to a single AI product.

| Do not use in docs or UI | Use instead |
|--------------------------|-------------|
| ChatGPT, GPT, OpenAI | **external AI**, **your AI**, **AI assistant** |
| Claude, Anthropic | **external AI**, **your AI** |
| Any other model/vendor brand | **external AI** |

**Spanish UI:** **IA** (never a product trademark).

Rationale: avoid vendor lock-in in the architecture story, legal/marketing coupling, and docs that age when the user switches tools.

Implementation code may keep generic comments like “curly quotes from paste” — not vendor names.

---

## Interaction model (closed)

MatrixTrade does **not** ask the user to analyze or calculate in forms.

```text
Visualize state in Matrix
  → Copy snapshot package
  → Discuss in external AI
  → Receive ONE AI Block (JSON)
  → Import (Dashboard or Inbox)
  → Human Apply
  → Supabase updated
```

**No auto-apply.** The human always Apply in `/inbox`.

Manual numeric forms for thesis, levels, scout setup, or trade edits are **not** the product surface. They are legacy or emergency paths only and must not be promoted in UI.

---

## Trade lifecycle mutations (single channel)

All changes to an open or planned trade — stop, target, shares, status, close, notes — are proposed by the AI as structured blocks:

| Block type | Use |
|------------|-----|
| `trade-update` | Adjust stop, target, entry, shares, thesis, playbook, status, etc. |
| `trade-close` | Close position at exit price |
| `trade-proposal` | New execution |
| `trade-review` | Post-close learning metadata |

One import path replaces scattered “Update / Close / Follow” buttons. The UI **visualizes**; the AI **proposes**; the user **Apply**.

Scouting and profile layers use `scout-assessment`, `file-update`, `decision-update`, `stock-case-create`, `evidence-add` — same Apply gate.

---

## Snapshot packages

| Package | Scope | Typical use |
|---------|-------|-------------|
| Full desk | `scouting` | All playbooks, stock files, scouts, monthly risk |
| One ticker | `scouting-ticker` or `stock-file` | Per-ticker discussion (stock-file includes evidence when loaded) |
| Full experiment | `exchange` | Trades + experiment snapshot on Dashboard |

See [ai-engineering.md](ai-engineering.md) for builders and REQUEST blocks.

---

## Related

- [ai-engineering.md](ai-engineering.md) — code map and block types  
- [strategic-planning-vision.md](strategic-planning-vision.md) — four layers  
- [adr-0001-trade-lifecycle-v1.md](adr-0001-trade-lifecycle-v1.md) — financial vs analytical lifecycle  
