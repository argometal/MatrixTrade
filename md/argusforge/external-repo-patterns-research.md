# ArgusForge Research Note — External Repository Patterns

**Status:** Research  
**Date:** 2026-07-23  
**Canonical AF contract:** [`phase-0-architecture.md`](phase-0-architecture.md)  
**Rule:** Patterns only. Do **not** copy code. Do **not** add dependencies. Do **not** reshape Phase 0.

---

## Priority table

| Repository | When | Theme | Priority |
|------------|------|-------|----------|
| [tirth8205/code-review-graph](https://github.com/tirth8205/code-review-graph) | Before designing Argus Engine | Incremental graph, SQLite, source≠graph, minimal context, neighborhood, dependencies, blast radius, MCP | **High** |
| [likec4/likec4](https://github.com/likec4/likec4) | When designing relational visualization / navigation | Declarative model, configurable types, derived views, nested levels, model≠representation | Medium (after relation model) |
| [koala73/worldmonitor](https://github.com/koala73/worldmonitor) | When AF has multi-source ingest | Normalization, stream correlation, freshness, synthesis, multiple products on shared architecture, human + agent access | Future |
| [rohitg00/ai-engineering-from-scratch](https://github.com/rohitg00/ai-engineering-from-scratch) | When formalizing AI workflows | Reusable artifacts, skills, prompts, agents, MCP, reproducible experiments | Future |
| [schollz/croc](https://github.com/schollz/croc) | Bridge / Data-transfer only | Secure resumable transfer | Outside AF core |

---

## Retomar pronto

### 1. tirth8205/code-review-graph — high

Useful for **Argus Engine** pattern study (not for code-review product features).

Pipeline of interest:

```text
source content
  → extraction / parser
  → graph
  → incremental update
  → targeted / minimal context
```

Study: incremental graph; SQLite as pragmatic store; separation of source and graph; neighborhood; dependencies; blast radius; MCP exposure.

In AF terms, nodes would later map to Chaos, entities, fragments, syntheses, relations — principle reusable; **no schema designed in Phase 0**.

### 2. likec4/likec4 — medium, later

Useful for a future **relationship viewer**, not for Chaos ingest. Declarative relations, configurable types, derived views, nested levels without treating visual hierarchy as identity.

---

## Retomar después

### 3. koala73/worldmonitor — future

Too large to copy. Reference for mature multi-ingest and situational awareness once Chaos already accepts pages, PDFs, email, images, events, and external product data.

### 4. rohitg00/ai-engineering-from-scratch — future

Curriculum / discipline reference (`problem → concept → build → use → reusable artifact`). No code extraction now.

---

## Otra necesidad

### 5. schollz/croc — Bridge only

Not AF core. Possible reference for secure device-to-device transfer. Keep separate from Chaos and Argus Engine.

---

## No priorizar

openship (deploy) · awesome-claude-skills (catalog later) · pi-web (agent UI too early) · cloudflare_temp_email (unrelated).

---

## Conclusion

| Need | Best reference |
|------|----------------|
| Argus Engine core patterns | **code-review-graph** |
| Relation visualization | likec4 |
| Mature ingest / correlation | worldmonitor |

Copy none.

---

## Related

| Document | Role |
|----------|------|
| [phase-0-architecture.md](phase-0-architecture.md) | Canonical Phase 0 |
| [README.md](README.md) | Index |
