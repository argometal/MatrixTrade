# ARGUS — Evidence Organization System

**Status:** Canonical (product identity)  
**Date:** 2026-07-09  
**Purpose:** Sharp product identity — what ARGUS is, what it is not, and how entities fit the mission.  
**Complements:** [`observation-engine-vision.md`](observation-engine-vision.md) (how the engine behaves) · [`knowledge-execution-model.md`](knowledge-execution-model.md) (ontology) · [`product-flow-proposal.md`](product-flow-proposal.md) (user flow)

**AI rule:** Before proposing features, UI copy, or new object types, verify alignment with this document. If a feature makes ARGUS feel like a note-taking or document-authoring app, reject or redesign it.

---

## One sentence

**ARGUS is an Evidence Organization System.**

It is not primarily a knowledge capture tool, a note-taking app, or a writing environment.

Authoring happens elsewhere. ARGUS receives reality, organizes it, correlates it, retrieves it, and delivers it as a defensible package.

---

## What ARGUS is NOT

ARGUS does not compete with applications whose primary job is **authoring**:

| Application | Primary job | Why ARGUS is different |
|-------------|-------------|------------------------|
| Word | Document authoring | ARGUS does not replace Word |
| OneNote | Free-form notes | ARGUS does not replace OneNote |
| Evernote | Personal knowledge capture | ARGUS does not replace Evernote |
| Obsidian | Linked note authoring | ARGUS does not replace Obsidian |

Those tools are for **writing and thinking in place**.

ARGUS is for **registering, connecting, and retrieving evidence** that already exists or was produced elsewhere.

If a feature asks the user to “write a document inside ARGUS,” question whether it belongs here or should remain an import/link from an external source.

---

## What ARGUS does

```text
Receive → Register → Context → Correlate → Retrieve → Deliver
```

### Receive (from anywhere)

Evidence can enter from any channel:

- Email
- PDF
- Word document
- Photo
- Teams / chat conversation (future intake)
- Short registered note (not long-form authoring)
- Report
- Technical document

### User verbs

| Verb | Meaning | User experience |
|------|---------|-----------------|
| **Receive** | Evidence arrives without user authoring | Inbox, file import, API |
| **Register** | “I have something” — record what happened | Register sheet |
| **Context** | Extend the graph with a named lens | Add context — person, topic, event… |
| **Correlate** | Assign relationships | **Link** modal — sacred; ARGUS is Link |
| **Retrieve** | Find everything for a subject | Browse, search, entity pages — ~95% of daily use |
| **Deliver** | Package evidence for someone else | Quick Package, Evidence Vault |

That is a different mission from “help me write better notes.”

---

## The architecture (no document creation)

There is **no document creation layer** in ARGUS. Only **evidence registration**.

```text
Evidence                    ← Email · File · Short note · Photo · Report
    ↓
Anchor                      ← Event (case / occurrence anchor)
    ↓
Context                     ← Project · Organization · Person · Topic
    ↓
Deliver                     ← Recognition · Incident · Knowledge · Relationship · Evidence Vault
```

### Layer definitions

| Layer | Role | Examples |
|-------|------|----------|
| **Evidence** | Raw artifacts — the only permanent asset | Inbox email, attachment, one-line note, photo, imported PDF |
| **Anchor** | A dated occurrence everything can hang from | Rig move, incident, handover meeting, HR case opening |
| **Context** | Lenses that give evidence meaning over time | Who, which company, which engagement, which long-term subject |
| **Deliver** | Purpose-specific export / presentation | Evidence Vault ZIP, incident package, relationship dossier |

Notice: **no “create document” step.** The user registers reality; ARGUS connects it.

---

## Entity roles (agreed meaning)

| Entity | Role | User question answered |
|--------|------|------------------------|
| **Event** | **Case anchor** — not “just a meeting” | “What happened here, and what evidence belongs to this occurrence?” |
| **Topic** | **Long-term context** that groups related evidence across years | “Everything we know about this subject across time.” |
| **Project** | **Business context** — bounded engagement | “What happened during this work?” |
| **Organization** | **Institutional context** — forever | “What is our history with this institution?” |
| **Person** | **Relationship context** — lifetime | “What is the evidence trail for this relationship?” |

### Event as case anchor (example)

**Rig Move** (Event) may accumulate:

- Emails
- Reports
- Photos
- Handover notes
- Meeting minutes
- Lessons learned

Everything hangs from the event. The event is not the notes — the event is the **anchor**; notes and files are **evidence**.

### Topic as long-term context

A Topic groups evidence across years — handovers, incidents, technical themes, HR subjects. It **organizes** evidence; it is not where you author documents. Optional description text is metadata, not the product’s center of gravity.

---

## Journal — reconsider the verb

The word **Journal** may mislead users into thinking ARGUS is for long-form writing.

**Better mental model:**

| Old framing | Evidence Organization framing |
|-------------|-------------------------------|
| “Write your thoughts” | **Register evidence** |
| “Daily journal” | **Record what happened** |
| “Note-taking” | **Capture a fact with minimal friction** |

Valid journal entries are often **one sentence**:

> “Discussion completed. See attached report.”

That is enough. ARGUS does not require paragraphs. It requires **faithful registration** of what occurred, with links to the artifacts that prove it.

**Terminology direction (UI):**

- Prefer **Register** · **Add context** · **Link** · **Record**
- Avoid **Create** · **Capture** · **Journal** · **New document** as primary verbs

See [`register-capture-redesign.md`](register-capture-redesign.md) · [`knowledge-execution-model.md`](knowledge-execution-model.md)

---

## Why “Create” feels wrong

The user is not **creating knowledge** inside ARGUS.

They are **registering reality** — something that already happened or already exists (email arrived, meeting occurred, report was produced).

| Misaligned verb | Aligned verb |
|-----------------|--------------|
| Create | Register |
| New document | Add evidence |
| Write | Record |
| Compose | Add context (extend the graph) |

The main intake action should feel like **evidence registration**, not **content authoring**.

---

## Competitive position

If this is the vision, ARGUS does not compete with note-taking apps.

It is closer to software used for:

- Case management
- Evidence management
- Engineering knowledge management
- Corporate investigations
- Technical handovers
- Professional portfolios / recognition dossiers

**Closest analogy (not a single product):**

> A lightweight combination of **case management**, **professional relationship memory**, and **evidence vault** — where authoring happens elsewhere and ARGUS is where everything is connected.

| Analogy | What ARGUS borrows |
|---------|-------------------|
| Case management | Occurrence anchor (Event), evidence chronology, export for review |
| CRM (professional, not sales pipeline) | Person/org relationship context over years |
| Evidence vault | Immutable trail, deliver on demand, defensible packages |

**Not the analogy:** Evernote, Notion-as-authoring, or “another notebook.”

---

## Why Deliver / Export matters

The value of ARGUS is not in writing documents.

The value is in being able to produce the **right evidence package** when someone asks:

> “Show me everything related to this project, incident, person, or topic.”

Deliver is not an afterthought — it is the **output layer** of an Evidence Organization System.

Implemented today: **Quick Package** (HTML handover + Markdown draft, `GET /api/argus/deliver/quick`) and **Evidence Vault v1** (`POST /api/argus/export`, `/argus/v2/deliver`).  
Format roadmap: [`deliver-formats-plan.md`](deliver-formats-plan.md). Future packages: incident, recognition, relationship, knowledge.

---

## Relationship to Observation Engine

These two framings are **complementary**, not contradictory:

| Framing | Answers |
|---------|---------|
| **Evidence Organization System** (this doc) | *What is ARGUS?* — product category and user promise |
| **Observation Engine** ([`observation-engine-vision.md`](observation-engine-vision.md)) | *How does ARGUS behave?* — observe, correlate, hypothesize, reconstruct; evidence before interpretation |

An Evidence Organization System **implements** an observation engine: it preserves objective reality with minimal friction and lets patterns emerge from accumulated evidence.

---

## Vision alignment checklist (quick)

| # | Question |
|---|----------|
| 1 | Does this **receive** evidence rather than replace an authoring tool? |
| 2 | Is the user **registering reality**, not “creating knowledge”? |
| 3 | Does every surfaced item trace to **evidence** (email, file, log)? |
| 4 | Do entities act as **anchor** (Event) or **context** (Project, Org, Person, Topic)? |
| 5 | Can the result be **delivered** as a defensible package? |
| 6 | Does copy use **Register / Capture / Record**, not “Write / Compose / Create document”? |

If three or more answers are “no” → revise before building.

---

## Implementation pointers (2026-07-09)

| Area | Alignment |
|------|-----------|
| Inbox | Receive email evidence; link to entities — not an email server |
| Topics browse | Evidence tab + timeline; topic as binder ([`intelligence-viz-plan.md`](intelligence-viz-plan.md)) |
| Events | Case anchor + Record/Chronicle/Metrics UI |
| Intelligence viz | Recency/recurrence from evidence counts — not manual ratings |
| Export | Evidence Vault — primary deliverable |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-09 | Initial canonical identity doc — Evidence Organization System framing |
