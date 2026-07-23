# ArgusForge Research Note — External Repository Patterns

**Status:** Research  
**Date:** 2026-07-23  
**Scope:** Patterns from captured external repos that may serve ArgusForge.  
**Method:** Not an exhaustive audit — searched for reusable patterns and what to defer.  
**Rule:** Do **not** copy these projects. Extract principles. Do **not** let mature-phase references reshape the Phase 1 minimum model.

---

## Priority table

| Repository | When | Theme to study |
|------------|------|----------------|
| [tirth8205/code-review-graph](https://github.com/tirth8205/code-review-graph) | **Before Argus Engine storage design** | Incremental graph, SQLite, minimal AI context, MCP |
| [likec4/likec4](https://github.com/likec4/likec4) | When designing relationship visualization | Declarative model, views, hierarchies |
| [koala73/worldmonitor](https://github.com/koala73/worldmonitor) | Advanced ingest phase | Normalization, correlation, freshness, multiple surfaces |
| [rohitg00/ai-engineering-from-scratch](https://github.com/rohitg00/ai-engineering-from-scratch) | When formalizing IA discipline | Skills, artifacts, reproducible experiments |
| [schollz/croc](https://github.com/schollz/croc) | Bridge / Data-transfer only | Secure resumable transfer |

---

## Retomar pronto

### 1. tirth8205/code-review-graph

**Most directly useful for Argus Engine.**

What matters is **not** code review — it is the architectural pattern:

- turns a complex source into a graph;
- stores nodes and relationships;
- updates only what changed;
- computes dependencies and “blast radius”;
- gives the AI only the minimum necessary context;
- exposes that context via MCP.

Especially interesting pipeline:

```text
source
  → parser
  → graph in SQLite
  → relational query
  → minimal context for AI
```

In their domain, nodes are functions, classes, and imports.  
In ArgusForge they would be Chaos, entities, fragments, syntheses, and relations.  
**The principle is reusable.**

#### What we could take

- incremental graph updates;
- separation between original data and relational map;
- neighborhood / dependency queries;
- “impact radius” of modifying, splitting, or archiving a Chaos;
- AI context selection without sending the whole library;
- future MCP integration;
- local SQLite as a pragmatic graph **before** a specialized graph DB.

**Action:** Dedicated technical analysis **before** designing Argus Engine storage.

---

### 2. likec4/likec4

Useful to understand how to represent a relational model via:

- declarative language;
- configurable node types;
- relation types;
- nested levels;
- multiple views generated from one source.

**Do not use as ArgusForge’s engine.** Its domain is software architecture, not general knowledge.

#### What we could take

- readable declarative definition of relations;
- separate model from visualizations;
- generate different views without duplicating data;
- allow visual hierarchies without making them real identity;
- study nested levels and customizable notation.

**Action:** Useful for a future **relationship viewer**, not for the first Chaos CRUD.

---

## Retomar en una fase posterior

### 3. koala73/worldmonitor

Very large; too much scope to copy now. Contains patterns for a **mature** ArgusForge stage.

Integrates hundreds of sources, AI synthesis, correlation across streams, and different products/views from one codebase. Also offers multiple surfaces over a shared architecture: web, desktop, API, CLI, MCP, SDK.

#### What we could take

- ingest from multiple providers;
- normalize before enrichment;
- correlate different streams;
- indicators derived from multiple signals;
- source freshness monitoring;
- one base feeding distinct products;
- architecture ready for humans and agents.

**Relevant when Chaos already ingests:** pages, PDFs, email, images, events, external product data.

**Must not** influence the Phase 1 minimum model. Reference for multi-ingest and situational awareness later.

---

### 4. rohitg00/ai-engineering-from-scratch

Not a product comparable to ArgusForge. Structured curriculum (~503 lessons), each producing reusable artifacts: prompts, skills, agents, or MCP servers.

Interesting discipline:

```text
problem → concept → build → use → reusable artifact
```

Each unit keeps a repeatable folder/result structure.

#### What we could take

- each ArgusForge phase produces a verifiable artifact;
- Cursor / agent-specific skills;
- evaluations for what context the user needs;
- uniform structure for AI experiments;
- eventual library of prompts and segmentation operations.

**Do not extract code now.** Keep as reference for AI engineering discipline.

---

## Útil, pero para otra necesidad

### 5. schollz/croc

Solves simple secure transfer between machines:

- end-to-end encryption;
- relay;
- cross-platform;
- resume;
- multiple files.

**Does not contribute to ArgusForge’s core.**

May reference the earlier Bridge / Data-transfer problem:

- file transport between devices;
- operation without opening ports;
- simple pairing codes;
- robust resumable transfer.

**Separate completely** from Chaos and Argus Engine.

---

## No priorizar ahora

| Capture | Why defer |
|---------|-----------|
| openship | Deployment; does not solve the knowledge model |
| awesome-claude-skills | Idea catalog; revisit when defining our own skills |
| pi-web | Agent UI; irrelevant until a stable backend exists |
| cloudflare_temp_email | Unrelated to the project |

---

## Main conclusion

| Need | Best reference |
|------|----------------|
| **ArgusForge core / Argus Engine** | **code-review-graph** |
| **Visualize relations** | likec4 |
| **Mature ingest + correlation** | worldmonitor |

Copy none. Use their patterns so ArgusForge does not re-solve problems that are already well bounded.

---

## Relation to Phase 1

Phase 1 builds Chaos contracts, operational org, Argus relation **types**, and a reserved MTA Engine.  
This note does **not** authorize adopting SQLite graphs, MCP, or viewers yet.

Next dedicated study (when opening Argus Engine storage): **code-review-graph** incremental graph + minimal AI context.

---

## Related

| Document | Role |
|----------|------|
| [phase-0-architecture.md](phase-0-architecture.md) | Sealed map |
| [phase-1-infrastructure.md](phase-1-infrastructure.md) | Active contracts phase |
| [alexandria-frozen-contract.md](alexandria-frozen-contract.md) | Alexandria FROZEN |
| [README.md](README.md) | Index |
