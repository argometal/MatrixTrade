# ARGUS — Register vs Add Context (verb convergence)

**Status:** Phase 1 shipped · Phase 2 agreed direction (2026-07-09)  
**Related:** [`evidence-organization-vision.md`](evidence-organization-vision.md) · [`knowledge-execution-model.md`](knowledge-execution-model.md) · [`ai-charter.md`](ai-charter.md)

---

## Assessment (~90–95% convergence)

The remaining work is **not** what entities exist. It is **what verbs the user experiences**.

| Old mental model | New mental model |
|------------------|------------------|
| Journal, Document, Note, Log, Topic, Event… | **Evidence → Context → Relationships → Packages** |
| Many create paths | **Register** (evidence) + **Add context** (graph) + **Link** (sacred) |

Storage unchanged. Vocabulary changes. That is the right kind of redesign.

---

## The convergence decision

### Keep: Register (the journal sheet)

**Why it wins**

- One verb: *“I have something.”*
- Simple modal: text → link → save
- Context-aware (topic timeline vs event date) without Log/Note
- Already homologated on topic/event pages

**Internal storage:** still `Log`. UI never says Journal.

### Retire as user verb: Capture

**Why it loses**

- “Capture” sounds like evidence intake — collides with Register and Receive
- The wizard is heavy (4 columns, steps, review, duplicate journal path)
- Its only unique value — **link while creating** — `ArgusLinkModal` already does better

**Rename in UI:** **Add context** — “I need a new person / topic / event in the graph.”

### Do not delete (yet): `ArgusCreateLinkWindow`

Keep for **inbox-evidence**, **runbook**, and internal paths until Phase 2b migrates them. No user-facing top-bar entry after Phase 2a.

---

## Target verbs (canonical)

```text
Receive → Register → Context → Correlate → Retrieve → Deliver
```

| Verb | UI | Component |
|------|-----|-----------|
| **Register** | Register button / FAB `+` | `CaptureSheet` |
| **Add context** | Add context button | *Phase 2:* slim flow (see below) |
| **Link** | Link on every entity, inbox, register | `ArgusLinkModal` — **sacred** |
| **Retrieve** | Browse, search, entity detail | v2 shells (daily work) |
| **Deliver** | Quick Package, Vault | deliver API + modals |

---

## Phase 1 (shipped)

| Change | Detail |
|--------|--------|
| Remove Log/Note toggle | `CaptureSheet` + `register-infer.ts` |
| Top bar split | Register + Capture → **Capture renames to Add context in Phase 2a** |
| `entityCaptureOnly` | Hides Knowledge (journal/document) from create menu |
| Topic/event scoped register | Pre-filled links, no date on topic, event date on event |
| Legacy wizard | Kept in codebase for inbox/runbook |

---

## Phase 2a (shipped — 070901)

| Task | Detail |
|------|--------|
| `AddContextFlow` | Kind picker → minimal form → **Link modal** — replaces heavy wizard on top bar |
| Top bar | Register + Add context (no legacy `ArgusCreateLinkWindow` for global entry) |
| Legacy wizard | Inbox, runbook, contextual `openCreateFlow` only |
| Entity pages | Link + Register; journal vocabulary removed from person/topic/event |

### Add context flow (target — same elegance as Register)

```text
1. Pick kind     Person · Org · Project · Topic · Event · Tag
2. Minimal form  Name + optional one-liner (ReferenceCreateModal pattern)
3. Link          ArgusLinkModal — search what exists, assign relationships
4. Save          Entity created + links persisted
```

No review step. No duplicate link panel. **Link is ARGUS.**

---

## Phase 2b — Inbox + runbook migration

| Task | Detail |
|------|--------|
| Inbox evidence | Link-only default via `ArgusLinkModal`; Register for new note |
| Runbook | Separate entry (Execution) — never mixed with Register |
| Retire wizard | Feature-flag or `legacy/` folder |

---

## Phase 3 — Intelligence (next architectural frontier)

Not new entities. The graph helps before the user thinks:

> Register: “Discussion about RSS optimization.”

Suggest: Topic **RSS** · Project **Petronas** · Org **SLB** · Person **Kyle**

Link modal becomes **suggest + confirm**, not search-only.

---

## Deprecated UI (not storage)

| UI label | Replacement | Storage |
|----------|-------------|---------|
| Journal | Register | `Log` |
| Log / Note | Inferred from context | `Log.kind` |
| Document (manual create) | File import / attachment | `Entity` other + attachments |
| Capture | Add context | `Entity` create actions |

Documents **appear** when PDF/DOCX/image/CAD is imported — no “New Document” button.

---

## Infer rules (`register-infer.ts`)

| Links | Stored kind | Date UI |
|-------|-------------|---------|
| Topic only | `log` (timeline) | Hidden |
| Event (± others) | `event` | Event date (auto) |
| Other / none | `event` | Optional |

---

## Code map

| Piece | Path |
|-------|------|
| Register sheet | `app/argus/components/CaptureSheet.tsx` |
| Kind infer | `lib/argus/register-infer.ts` |
| Top bar | `app/argus/components/AddRegisterCaptureButtons.tsx` |
| Link (sacred) | `app/argus/components/ArgusLinkModal.tsx` |
| Legacy wizard | `ArgusCreateLinkWindow.tsx` — retire from top bar in 2a |
| Copy | `lib/argus/ux-copy.ts` — `REGISTER`, `ADD_CONTEXT` |

---

## Decision checklist

Before any new UI:

1. Is this **Register** (evidence) or **Add context** (entity)?
2. Does it end with **Link**?
3. Does it avoid Journal / Document / Capture vocabulary?
4. Does it reinforce **Retrieve** (find evidence) or **Deliver** (package for others)?
