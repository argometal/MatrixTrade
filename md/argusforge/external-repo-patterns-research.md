# ArgusForge Research Note — External Repository Patterns

**Status:** Research  
**Date:** 2026-07-23  
**Canonical AF contract:** [`phase-0-architecture.md`](phase-0-architecture.md)  
**Rule:** Patterns and candidates only until an **explicit reuse decision**.  
Do **not** adopt automatically. Do **not** forbid automatically.  
Before reuse, review: license, security, maintenance, activity, compatibility, dependency, portability, isolation, future cost, reversibility.  
Do **not** reshape sealed vision or Phase 0 without human approval.

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

Reuse requires an explicit decision after evaluation (see Rule above). Patterns may feed Vault formation context — not Chaos dumps, not Memory copies — see [`vault-training-layer-contract.md`](vault-training-layer-contract.md).

---

## Related

| Document | Role |
|----------|------|
| [phase-0-architecture.md](phase-0-architecture.md) | Canonical Phase 0 |
| [af03-chaos-interface-contract.md](af03-chaos-interface-contract.md) | Interface checklist |
| [vault-training-layer-contract.md](vault-training-layer-contract.md) | Formation prep layer |
| [README.md](README.md) | Index |
