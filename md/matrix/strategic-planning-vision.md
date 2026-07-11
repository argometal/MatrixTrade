# MatrixTrade — Strategic Planning Vision

**Status:** Canonical product identity (2026-07-10).  
**V2 engines:** [v2-engine-architecture.md](v2-engine-architecture.md)  
**Runtime today:** [runtime-truth.md](runtime-truth.md)

---

## Identity (one sentence)

**MatrixTrade is not a conventional trading journal.**

It is a **strategic planning system**: proven method → per-ticker profile → go/no-go decision with quantified risk → execution and review.

Trade recording (`/trades`, journal, statistics) is the **floor** of the building, not the mission.

---

## What MatrixTrade is / is not

| MatrixTrade **is** | MatrixTrade **is not** |
|--------------------|-------------------------|
| A pipeline from idea to execution with explicit gates | A P/L spreadsheet with charts |
| Per-ticker memory built through analysis | A one-off note per trade |
| A place that can **stop you** (risk, invalidation, minimum R:R) | A passive log of what already happened |
| AI-assisted **after** the model is trained on Matrix mechanics | ChatGPT guessing without structure |
| Private, rule-enforced, versioned | Public signals or social trading |

---

## The four layers (architecture)

Strict order — never reverse:

```text
Playbook        →  HOW we operate (proven style / strategy)
Stock File      →  WHO is this ticker (profile built from analysis)
Scouting Desk   →  DO we trade? WHEN? HOW MUCH RISK? (go / wait / stop)
Trade           →  WHAT we executed (H00x, P/L, review)
```

### Metaphor map (shared language)

| Layer | Metaphor | Question |
|-------|----------|----------|
| **Playbook** | Manual de procedimiento / field manual | ¿Cómo operamos este estilo? |
| **Stock File** | Expediente del paciente / dossier del objetivo | ¿Quién es TSLA? ¿Qué niveles, estructura, invalidación? |
| **Scouting Desk** | Sala de decisión / mesa de caso / consulta | ¿Entramos o no? ¿Cuándo es favorable? ¿Cuánto riesgo? |
| **Trade** | Acto ejecutado / registro clínico post-intervención | ¿Qué hicimos y cómo salió? |

**Rule of gold:** Playbook → Stock File → Scouting Desk → Trade.

---

## Layer detail

### 1. Playbook (method)

- **Role:** Reusable, **tested** operating method — rules, checklist, forbidden errors.
- **Examples:** Weekly Breakout, Support Reversal, Swing Accumulation.
- **Not:** Per-ticker analysis. Not “what we think about TSLA today.”
- **Today:** `/playbook`, `data/playbooks.json`. Layer exists; content still sparse — **leave as-is** until strategies are proven.
- **Status:** Correct place in architecture; population is a separate problem.

### 2. Stock File (target profile)

- **Role:** Strategic memory **per ticker** — the “patient file” / “target dossier.”
- **Built from:** Multi-timeframe analysis, levels, zones, targets, invalidation, minimum R:R, current hypothesis.
- **Naming note:** Code and routes still say **Stock Thesis** (`stock-theses`, `ST-TSLA-001`). Target name: **Stock File** (or Dossier / Target File). Rename is documentation + UI first; code IDs can follow.
- **Pilot:** `ST-TSLA-001` — swing profile, zones 340–355 / 300–320, min 3R, invalidation monthly &lt; 300.
- **Today:** `/stock-theses/[id]`, `data/stock-theses.json`. Usable for view, edit status/hypothesis/notes, copy context for chat.

### 3. Scouting Desk (go / no-go)

- **Role:** **Gatekeeper** of strategic planning — not just “save entry/stop/target.”
- **Must answer:**
  - ¿Operamos este candidato **ahora**?
  - ¿Bajo qué condiciones es favorable?
  - ¿El riesgo cuantificado (R:R, room mensual, invalidación) **permite** avanzar?
  - ¿**Detener** o **avanzar**?
- **Includes:** Link to active Playbook + Stock File; explicit go/wait/no decision; risk quantification before any trade.
- **Today (gap):** Route `/planning` is labeled **Scouting Desk** in UI but tactical scouts (PLAN-xxx) still carry most of the workflow. Candidate evaluation logic lives partly on Stock File. **Full gatekeeper behavior is ongoing.**
- **Naming:** **Scouting Desk** (chosen 2026-07-10). Route stays `/planning`.

### 4. Trade (execution)

- **Role:** Numeric source of truth for what was executed — entry, stop, exit, P/L, review.
- **Links (target):** `stockFileId`, `decisionLabRef` / `planId`, `playbookId`, thesis version at entry.
- **Today:** Mature recording layer. Full causal links from Decision Lab → Trade = Phase 1+.

---

## AI mechanics (required)

Explaining the full model to every new chat is too heavy. Matrix needs a **fixed training block** read **before** case data:

```text
1. MATRIX MECHANICS   →  layers, order, rules, what AI may/may not do
2. PLAYBOOK           →  active method (if any)
3. STOCK FILE         →  target profile (e.g. TSLA)
4. SCOUTING STATE →  go / wait / no + quantified risk
5. USER QUESTION      →  only then
```

**Today (partial):**

- `md/protocols/chat-handoff-trading-book.md` — long manual checklist
- `buildStockThesisContextText()` — one ticker only
- `/exchange` snapshot — trades + plans overview, not mechanics primer

**Shipped (2026-07-10):** `buildMatrixMechanicsBrief()` in `lib/matrix-mechanics-brief.ts` — prepended to `/exchange` snapshot and available via copy buttons on Scouting Desk and Stock File pages.

---

## Relationship to MATRIX v2 knowledge base

The repo still holds long-term memory (`companies/`, `journal/`, `md/`, Obsidian vault). That layer **feeds** Stock Files and reviews; it does not replace the in-app strategic pipeline.

```text
Repo / vault (deep memory)  →  informs  →  Stock File (app profile)
App strategic pipeline    →  Playbook → File → Lab → Trade
ChatGPT                     →  reasoning on top of structured exports
```

See `MATRIX-v2-VISION.md` for folder-level knowledge-base intent; **product mission** lives in this document.

---

## Phased direction

| Phase | Focus | Status |
|-------|-------|--------|
| **0** | Stock Profile + Scouting + AI fleet | Shipped (partial) |
| **A** | V2 library — engines, profile, scout | **Done** 2026-07-10 |
| **B–E** | Code: Evidence → Decision → Probe → Learning | See [v2-engine-architecture.md](v2-engine-architecture.md) |

Recording features continue; they **support** the mission but are not the mission statement.

---

## Naming — Scouting Desk (resolved)

**Chosen name (2026-07-10):** **Scouting Desk** — gatekeeper layer where candidates are scouted for go / wait / no with quantified risk.

Route stays `/planning`; code IDs (`plans`, `stock-theses`) unchanged.

### Historical candidates (archived)

```text
Playbook     = manual táctico (cómo)
Stock File   = expediente / dossier (quién es el objetivo)
???          = sala donde se decide si se actúa (cuándo, cuánto riesgo)
Trade        = registro de lo ejecutado
```

### Candidate names

| Name | Metaphor | Pros | Cons |
|------|----------|------|------|
| **Case Board** | Mesa de caso (investigación) | Pairs with dossier + playbook; implies team decision | Slightly investigative jargon |
| **Ops Brief** | Briefing operativo | Pairs with Playbook (military); “brief before action” | Less “stop/go” explicit |
| **Clearance Desk** | Autorización | Strong go/no-go | Cold, bureaucratic |
| **Engagement Desk** | Cuándo enganchar al objetivo | Clear action gate | “Engagement” overloaded in software |
| **Scout Desk** | Scouting del candidato | Matches “revisar candidatos” | Sounds pre-analysis, not decision |
| **Triage** | Médico — priorizar / actuar o esperar | Strong wait/stop semantics | Medical; may confuse with healthcare |
| **Consulta** | Médico — decisión clínica | Natural in Spanish | Vague in English codebase |
| **Sala de Decisión** | Neutral, clear | Obvious meaning | Long; less “product name” |

**Recommendation (provisional):** **Case Board** (EN) / **Mesa de Caso** (ES) — dossier on the target, playbook on the method, case board for **¿movemos o no?**

Route can stay `/planning` or become `/case-board` later; **identity label** matters more than URL in Phase 1.

---

## Vision alignment checklist

Use when adding features or onboarding a chat:

- [ ] Does this belong to Playbook, Stock File, Decision Lab, or Trade — not two at once?
- [ ] Is layer order preserved (method → profile → decision → execution)?
- [ ] Does the feature **quantify risk** or **gate** before trade creation?
- [ ] Is AI given mechanics **before** ticker/playbook payload?
- [ ] Is historical data preserved (no silent overwrite of files or closed trades)?

Periodic review: when Decision Lab ships, add `vision-review-protocol.md` mirroring ARGUS cadence.

---

## Related docs

| Doc | Relation |
|-----|----------|
| [library-alignment-backlog.md](library-alignment-backlog.md) | Docs still out of sync — update queue |
| [../design/stock-thesis-proposal.md](../design/stock-thesis-proposal.md) | Phase 0 technical proposal |
| [../protocols/chat-handoff-trading-book.md](../protocols/chat-handoff-trading-book.md) | Pre-design checklist (pre-mechanics-brief era) |
| [../rules/investment-principles.md](../rules/investment-principles.md) | Capital preservation — applies to all layers |
| [../../MATRIX-v2-VISION.md](../../MATRIX-v2-VISION.md) | Legacy knowledge-base north star |
