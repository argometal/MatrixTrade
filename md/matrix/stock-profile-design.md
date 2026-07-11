# Stock Profile — design (suspect dossier)

**Status:** Canonical design (2026-07-10).  
**Naming:** **Stock Profile** (user-facing). Code today: `StockThesis` / `stock-theses` — rename in UI first, ids later.

**Purpose:** Balanced, **light**, **append-friendly** dossier per ticker — any chat can patch values without rewriting history.

---

## Your requirements (restated)

1. **Do not overwrite** — filter, tune, trim over time; keep audit trail.
2. **Light to add** — stream evidence and corrections without schema explosion.
3. **Eventually without Cursor** — any chat reads mechanics, talks, proposes `file-update` / `evidence-add`; you Apply.
4. **Honest runtime** — know what saves today vs what is read-only fiction in UI.
5. **Steal good patterns** — not clone a journal; borrow dossier / memo / evidence-stream ideas.

---

## What saves TODAY (runtime truth)

Storage: `data/stock-theses.json` (JSON store; no Supabase table yet).

| Field / section | In JSON | Editable in UI | Editable via Inbox |
|-----------------|---------|----------------|---------------------|
| `id`, `ticker`, `style` | Yes | No (seed) | No |
| `thesis` (long thesis) | Yes | **Read-only** in UI | `file-update.thesis` overwrites field |
| `historicalAnalysis[]` | Yes | **Read-only** | No |
| `levels` (zones, targets) | Yes | **Read-only** | No |
| `riskRules` (min RR, invalidation) | Yes | **Read-only** | No |
| `currentHypothesis` | Yes | Yes (form) | `file-update` |
| `status` | Yes | Yes (form) | `file-update` |
| `notes` | Yes | Yes (form) | `file-update` appends stamped block |
| `version` | Auto +1 on save | — | — |
| Scout assessments | Appended into `notes` | — | `scout-assessment` |

**Gaps you sensed correctly:**

- Most of the dossier (levels, structure, analysis) is **fixture-only** — TSLA was seeded by dev, not by you.
- UI shows a “full file” but only **3 fields** save manually.
- No create-profile flow — only `ST-TSLA-001` exists.
- No evidence layer — thesis is **handwritten**, not derived.
- `notes` can grow messy (assessments append) — needs structured sections in V2.

---

## V2 Stock Profile — layered model (no overwrite)

Three layers on one ticker — **never merge into one blob**:

```text
┌─────────────────────────────────────────┐
│  LAYER A — Evidence stream (append)      │  ME-xxx rows, immutable
├─────────────────────────────────────────┤
│  LAYER B — Synthesis snapshot (version)  │  hypothesis, confidence, zones
├─────────────────────────────────────────┤
│  LAYER C — Annotations (append)          │  chat assessments, lessons
└─────────────────────────────────────────┘
```

| Layer | Mutation rule |
|-------|---------------|
| A Evidence | Add only; supersede with pointer |
| B Synthesis | New version when batch of evidence applied; old version kept |
| C Annotations | Append only (today’s `notes` behavior) |

**You never edit Layer A.** You **propose** Layer B changes via inbox; you **trim** display in UI, not delete DB rows.

---

## Synthesis snapshot (light — max ~12 fields)

What any chat should see in one screen:

| Group | Fields |
|-------|--------|
| Identity | ticker, style, status, version |
| Confidence | thesisConfidence (0–100), lastUpdated |
| Story | oneLineThesis, currentHypothesis |
| Structure | majorSupport, majorResistance, primaryZone, secondaryZone |
| Targets | targets[] |
| Rules | minimumRR, invalidation |
| Pointers | activeEvidenceIds[] (last N) |

Long prose moves to **evidence** or **annotations** — not the snapshot core.

---

## Stolen patterns (what to borrow, not copy)

| Source | Steal | Do not steal |
|--------|-------|--------------|
| **ARGUS** (same repo) | Evidence stream, append-only, entity dossier, export package | HR/org/project ontology |
| **Investment memo** (buy-side) | One-page summary + appendix; thesis vs catalyst vs risks | Word doc workflow |
| **Koyfin / research cards** | Ticker header + few KPIs + “what changed” | Live market data feed (V2 defer) |
| **TraderSync tags** | Dimensional tags on episodes | Broker sync |
| **Edgewonk** | Separate psychology from setup quality | Tiltmeter as product center |
| **Obsidian + frontmatter** | Structured header + free body | File-system as source of truth (app owns numbers) |
| **Clinical chart** | Chief complaint = hypothesis; vitals = evidence; plan = scout | Medical UI literally |

**Matrix unique combo:** Evidence stream (ARGUS-style) + Decision scout (not journal) + Inbox Apply (human gate) + monthly risk cap.

---

## Chat-friendly patch model (target)

Any chat should only propose **small patches**:

```json
{ "type": "evidence-add", "proposal": { "stockProfileId": "ST-TSLA-001", "category": "structure", "timeframe": "1W", "value": "HH/HL intact", "confidence": 72 } }
```

```json
{ "type": "file-update", "proposal": { "id": "ST-TSLA-001", "currentHypothesis": "...", "thesisConfidence": 78 } }
```

Never “rewrite entire profile JSON.”

---

## Trimming & tuning (without overwrite)

| Action | Mechanism |
|--------|-----------|
| Wrong evidence | `supersededBy` new evidence id |
| Stale hypothesis | new synthesis `version` |
| Noisy notes | UI collapse old annotations; archive section in export |
| Invalidated ticker | `status: invalidated` — profile frozen, scouts blocked |

---

## UI principle (when we code)

**One page, three tabs:**

1. **Snapshot** — synthesis (editable patches only)
2. **Evidence** — chronological stream + “Add evidence”
3. **History** — versions, assessments, scouts

No 15-field form on load. **Progressive disclosure.**

---

## Migration from today

| Today | V2 path |
|-------|---------|
| `StockThesis` type | `StockProfile` + `MarketEvidence[]` |
| `historicalAnalysis[]` | Migrate rows → Evidence (`category: structure`) |
| `notes` | Layer C annotations |
| Read-only sections | Become Layer B until evidence-add UI ships |

Existing `ST-TSLA-001` JSON remains valid — migration **adds** evidence rows, does not delete thesis text.

---

## Related

- [runtime-truth.md](runtime-truth.md) — routes and files today
- [v2-engine-architecture.md](v2-engine-architecture.md)
- [scout-execution-model.md](scout-execution-model.md)
- [ai-engineering.md](ai-engineering.md)
