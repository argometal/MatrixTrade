# ARGUS — Knowledge & Execution Model

**Status:** Agreed direction (2026-07-07). Runbook is the first Execution type in the app.

**Parent vision:** [`observation-engine-vision.md`](observation-engine-vision.md) — ARGUS is an observation engine; Execution guides procedure without replacing evidence.

**Not the same as:** `v2-design-checklist.md` (internal UI/design QC only).

---

## Two domains

| Domain | Role | Question answered |
|--------|------|-------------------|
| **Knowledge** | Preserve what happened | “What do we know?” |
| **Execution** | Guide what should happen | “What should we do?” |

Knowledge and Execution are peers. Execution is not a special case of Topic, Event, or Journal.

---

## Ontology

```
ARGUS
├── Knowledge (evidence)
│   ├── Journal
│   ├── Email
│   └── File
├── Knowledge structure (lenses / entities)
│   ├── Person      — history of a relationship
│   ├── Organization — history of an institution
│   ├── Project     — what happened during an engagement
│   ├── Topic       — permanent subject (binder, not folder)
│   └── Event       — when something happened (the meeting; not the notes)
└── Execution
    ├── Runbook     — procedure with steps and progress (checklist UI)
    ├── Reminder    — (future)
    └── Follow-up   — (future; journal follow_up kind may migrate here)
```

### Distinctions (agreed)

- **Event (entity)** = “The meeting.” **Journal** = “What happened.” **Email** = evidence.
- **Topic** = permanent subject that collects linked evidence — graph binder, not filesystem folder.
- **Runbook** = execution object. A checklist is one visualization of a runbook.
- **Inspection, audit, training, deployment** = future Execution types with steps + completion.

---

## Create menu intent (target)

| Section | Items | User intent |
|---------|-------|-------------|
| **Knowledge** | Journal, Document | “I need to record or reference something.” |
| **Entity** | Person, Organization, Project, Topic, Event, Tag | “I need a named thing in the graph.” |
| **Execution** | Runbook | “I need to prepare or follow a procedure.” |

Capture (quick note) stays separate from the full Create workspace.

---

## Runbook (v1 implementation)

- Stored in `ArgusData.runbooks[]` — separate from entities and logs.
- Fields: `title`, `items[]` (`text`, `done`, `doneAt`, `type: item|sep`), `linkedEntityIds`.
- Create: paste steps (one line = one item; blank line = section).
- Work: checkbox UI on `/argus/v2/runbooks/[id]`; optional link to project/org.
- No assignees, due dates, or forced completion.

---

## What we are not doing yet

- Task ownership / SLA / team workflow
- Full Capture → Knowledge → Entity → Execution top-level launcher redesign
- Migrating `Log.kind = follow_up` to Execution table
- Replacing Document entity with evidence type (v01 migration track)
