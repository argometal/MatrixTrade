# ArgusForge — Vault Training Layer Contract

**Status:** Canonical — architecture / documentation only  
**Date:** 2026-07-23  
**Parent:** [`argusforge-contract.md`](argusforge-contract.md) (sealed vision §11) · [`phase-0-architecture.md`](phase-0-architecture.md)  
**Rule:** Do not implement tables, endpoints, components, migrations, automatic prompts, agents, or executable pipelines from this document. Do not treat Vault as Memory.

This file is the **detail contract for Vault**. The sealed ArgusForge Contract prevails for overall mission: Vault **prepares formation** for a task or recipient (AI, person, family transfer, continuity guide, etc.).

---

## 1. Conceptual correction — Memory ≠ Vault

Do **not** mix Memory and Vault.

### Memory

Memory belongs to the ecosystem’s knowledge.

Answers:

> *What does the system know?*

May include:

- identity;
- references;
- consolidated knowledge;
- context;
- relations;
- origin;
- cross-product links.

**Memory is part of the product / knowledge layer** (via Memory Registry and product stores — see Phase 0).

### Vault

Vault is **not** the general knowledge store.

Vault is the layer that **prepares formation and operational context** for collaboration between:

- user;
- AI;
- Cursor;
- architecture process;
- implementation process;
- and, when relevant, another person or family recipient.

Answers:

> *What context and formation does this recipient need for this concrete task — without retraining from zero or dumping the entire system?*

---

## 2. Mission

Vault exists because the user otherwise must repeatedly explain:

- what was built;
- why it was built;
- which decisions are sealed;
- which errors already happened;
- which alternatives were discarded;
- how the AI must interact;
- what must not be touched;
- what research is still missing.

That generates: loss of focus, repetition, contradictions, accidental redesign, premature implementation, digression, and loss of accumulated context.

**Official mission:**

> Reduce the cost of retraining the AI and let every conversation start from the real level the project has already reached.

---

## 3. Vault is not

Vault is **not**:

- Memory Registry;
- a universal knowledge database;
- a replacement for documentation;
- a dump of every file;
- a store of full papers;
- a store of external repositories;
- a chatbot;
- general semantic memory;
- a relation engine;
- a temporal engine.

Vault does **not** replace:

- Memory;
- Argus Engine;
- MTA Engine;
- Chaos;
- technical documentation;
- GitHub;
- proprietary repositories.

---

## 4. What Vault must deliver

Vault must produce **precise operational context** to train the AI — actionable, not only narrative summaries.

| Output type | Contents (examples) |
|-------------|---------------------|
| **Project Context** | Product in focus; current state; living architecture; limits; frozen modules; forbidden dependencies |
| **Decision Context** | Decision; reason; evidence; discarded alternatives; consequences; date; status (provisional / sealed) |
| **Interaction Context** | Human vs programming mode; response rules; what AI must not assume; when to stop; delivery format |
| **Implementation Context** | File; responsibility; state; prior changes; known risks; constraints; expected verification |
| **Research Context** | Problem under study; standards; repos/papers reviewed; learnings; what remains to verify; what not to adopt yet |
| **Error Context** | What went wrong; why; which signal was ignored; how to avoid repeating it |

---

## 5. Research before design

**Operating principle:**

Before designing a new module, research how the problem is already solved in industry, mature products, standards, papers, and relevant repositories.

Recommended flow:

```text
Problem
  → Research
  → Evidence
  → Extracted patterns
  → Vault training context
  → Architecture decision
  → Implementation
```

Do **not** use:

```text
Idea → Immediate architecture → Immediate implementation
```

Research must be rigorous when mature market solutions already exist.

---

## 6. Chaos and Vault

Chaos may capture raw material: ideas, conversations, papers, repositories, images, notes, tests, results, errors.

Vault must **not** automatically copy all of Chaos.

Vault receives only the **extracted training context** from that material.

Example:

| Layer | Content |
|-------|---------|
| **Chaos** | Full code-review-graph repository (raw) |
| **Vault** | Problem it solves; relevant pattern; possible AF application; risks; what not to copy; when to resume |

Chaos keeps raw material.  
Vault keeps derived **operational training**.

---

## 7. Memory and Vault

Strict separation:

| Layer | Role | Example |
|-------|------|---------|
| **Memory** | System knowledge | *Argus Engine relates entities through typed relations.* |
| **Vault** | How the AI must act on that knowledge | *Do not merge Argus Engine with MTA Engine. Separation was decided because semantic relation and temporal recurrence are different dimensions.* |

Memory stores knowledge.  
Vault stores how the AI should behave relative to that knowledge.

---

## 8. Relation to MTA Engine (future — not implemented)

MTA Engine may later observe Vault-related activity, for example:

- repeatedly revisited decisions;
- recurring errors;
- frequently used training documents;
- contracts changed many times;
- modules that need constant re-explanation;
- recurring external references;
- frequently contradicting instructions.

MTA detects temporal recurrence.  
Vault uses that signal to improve training context.

**Do not implement this integration now.** Document future responsibility only.

---

## 9. Relation to Argus Engine (future — not implemented)

Argus Engine may later relate: decisions, errors, modules, repositories, papers, patterns, constraints, implementations.

Vault may use those relations to assemble relevant training context.

Example:

```text
Current task: Design Argus Engine storage
Related Vault context:
  - Chaos definition
  - Memory Registry contract
  - code-review-graph research
  - LikeC4 research
  - previous graph-model errors
```

Argus discovers what context is relevant.  
Vault presents it as operational training.

**Do not implement this integration now.**

---

## 10. Vault unit (conceptual guide — not a schema)

Do **not** define a final schema or database migration. A Vault unit should eventually be able to represent at least:

- title;
- project;
- scope;
- context type;
- statement;
- rationale;
- evidence references;
- status;
- createdAt;
- updatedAt;
- source references;
- related decisions;
- applicable modules;
- constraints;
- recurrence signals;
- confidence;
- supersededBy.

Conceptual guide only.

---

## 11. Possible statuses (conceptual — no transition logic yet)

| Status | Meaning |
|--------|---------|
| **draft** | Incomplete context |
| **reviewed** | Reviewed, not necessarily adopted |
| **adopted** | In active use |
| **sealed** | Must not be reinterpreted without an explicit decision |
| **deprecated** | Must no longer apply |
| **superseded** | Replaced by another unit |
| **rejected** | Evaluated and discarded |

---

## 12. Vault output

Output must be compact and task-specific. Do not flood the AI with full history. Select only what the current task needs.

Conceptual format:

```text
VAULT TRAINING PACK
PROJECT
  ArgusForge
CURRENT TASK
  Define Argus Engine storage model
SEALED DECISIONS
  - Chaos is not Locus.
  - Memory owns identity.
  - Argus relates.
  - MTA observes time.
  - Alexandria is frozen.
RELEVANT RESEARCH
  - code-review-graph: incremental graph, SQLite, minimal context
  - LikeC4: model and representation must remain separate
KNOWN ERRORS
  - Implementation started before research.
  - Memory and Vault were previously confused.
CONSTRAINTS
  - No graph visualization yet.
  - No Alexandria dependency.
  - No new database without evidence.
OPEN QUESTIONS
  - Relation schema.
  - Confidence model.
  - Incremental extraction boundary.
```

**Vault must train without distracting.**

---

## 13. Sealed principle

**Official (EN):**

> Vault is not project memory. Vault prepares formation: the selected context a recipient needs to work correctly with the project’s knowledge, architecture, history, constraints, and research.

**Official (ES):**

> Vault no es la memoria general del proyecto. Vault prepara formación: el contexto seleccionado que un receptor necesita para trabajar correctamente con el conocimiento, arquitectura, historial, restricciones e investigación ya acumulados.

Parent sealed vision: [`argusforge-contract.md`](argusforge-contract.md) §11.
---

## 14. Phase boundary

This contract is documentation only.

- No Phase 1 implementation from this file.
- No new database.
- Alexandria remains FROZEN.
- Argus remains relational; MTA remains temporal.

---

## Related

| Document | Role |
|----------|------|
| [phase-0-architecture.md](phase-0-architecture.md) | AF Phase 0 — links Vault definition here |
| [external-repo-patterns-research.md](external-repo-patterns-research.md) | Research that may feed Vault training context |
| [alexandria-frozen-contract.md](alexandria-frozen-contract.md) | Alexandria freeze |
| [af03-chaos-interface-contract.md](af03-chaos-interface-contract.md) | Chaos UI checklist — Vault prep boundary only when authorized |
| [README.md](README.md) | Index |
