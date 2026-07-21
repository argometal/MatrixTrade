# ARGUS — Knowledge & Execution Model

**Status:** Agreed direction (2026-07-07, updated 2026-07-09). Runbook is the first Execution type in the app.

**Product identity:** [`evidence-organization-vision.md`](evidence-organization-vision.md) — ARGUS is an Evidence Organization System; authoring happens elsewhere.  
**Parent vision:** [`observation-engine-vision.md`](observation-engine-vision.md) — observation engine; Execution guides procedure without replacing evidence.

**Not the same as:** `v2-design-checklist.md` (internal UI/design QC only).

---

## Evidence registration (not authoring)

Journal is not “write your thoughts.” It is **register evidence** — sometimes one sentence:

> “Discussion completed. See attached report.”

That is sufficient. Evidence enters from email, files, photos, reports, and short notes. ARGUS connects; it does not replace Word or Obsidian.

---

## Two domains

| Domain | Role | Question answered |
|--------|------|-------------------|
| **Knowledge** | Preserve what happened | “What do we know?” |
| **Execution** | Guide what should happen | “What should we do?” |

Knowledge and Execution are peers. Execution is not a special case of Topic, Event, or Journal.

---

## Ontology

Aligned with [`evidence-organization-vision.md`](evidence-organization-vision.md) § The architecture:

```text
Evidence → Anchor (Event) → Context (Project · Organization · Person · Topic) → Deliver
```

```
ARGUS
├── Knowledge (evidence) — register, do not author
│   ├── Journal          — short evidence registration (not long-form writing)
│   ├── Email
│   └── File
├── Knowledge structure (context lenses)
│   ├── Person           — relationship context (lifetime)
│   ├── Organization     — institutional context (forever)
│   ├── Project          — business context (bounded engagement)
│   ├── Topic            — knowledge binder (years of evidence)
│   └── Event            — case anchor (occurrence; evidence hangs here)
└── Execution
    ├── Runbook          — procedure with steps and progress (checklist UI)
    ├── Reminder         — (future)
    └── Follow-up        — (future; journal follow_up kind may migrate here)
```

### Distinctions (agreed)

- **Event** = **case anchor** — the rig move, incident, handover, meeting occurrence. Not “just a calendar item.” Evidence (email, report, photo, minutes) hangs from the event.
- **Journal** = **register evidence** — what was recorded about reality. Not a substitute for Word.
- **Email / File** = evidence artifacts received or linked.
- **Topic** = **knowledge binder** — permanent subject collecting linked evidence across years; graph binder, not filesystem folder.
- **Project** = business context for a bounded engagement.
- **Organization** = institutional context across the full relationship.
- **Person** = relationship context across the full relationship.
- **Runbook** = execution object. A checklist is one visualization of a runbook.
- **Inspection, audit, training, deployment** = future Execution types with steps + completion.

---

## Capture verbs (target UI copy)

The user is **registering reality**, not creating knowledge. Prefer:

| Use | Avoid as primary |
|-----|------------------|
| Register | Create |
| Capture | New document |
| Add evidence | Compose |
| Record | Write (when meaning intake) |

Capture (quick note) stays separate from the full Create workspace until the launcher is redesigned.

---

## Create menu intent (interim — until launcher redesign)

| Section | Items | User intent |
|---------|-------|-------------|
| **Knowledge** | Journal, Document | “I need to record or reference something.” |
| **Entity** | Person, Organization, Project, Topic, Event, Tag | “I need a named thing in the graph.” |
| **Execution** | Runbook | “I need to prepare or follow a procedure.” |

Capture (quick note) stays separate from the full Create workspace.

---

## Runbook (implementation)

- Stored in `ArgusData.runbooks[]` — shared checklist **templates** (Execution), separate from entities and logs.
- Fields: `title`, `items[]` (`text`, `done` = template default only, `doneAt`, `type: item|sep`), `linkedEntityIds`.
- Vocabulary: each checklist row is a **check** (not a “card”).
- **Organization** = Runbooks library (create/edit templates). Templates are assigned by linking (`linkedEntityIds`) to Project / Topic / Event (and may stay linked to the org).
- **Project / Topic / Event** = Runbooks tab — assign or copy from library, then execute.
- Per-level state lives in `ArgusData.runbookProgress[]`: `{ runbookId, entityId, checks, closed }` — only check done/open + closed for that entity; the checklist text is not copied unless the user explicitly **Copy**.
- Create: paste steps (one line = one check; blank line = section).
- Work panel: execute checks at a scope; template rebuild / AI bulk stay on the org library (or non-execute mode).
- No assignees, due dates, or forced completion.

---

## What we are not doing yet

- Task ownership / SLA / team workflow
- Full Capture → Knowledge → Entity → Execution top-level launcher redesign
- Migrating `Log.kind = follow_up` to Execution table
- Replacing Document entity with evidence type (v01 migration track)
- Parallel Trello boards / `Runproject` / `Runtopic` entity types — evolve existing list↔card viewers instead
