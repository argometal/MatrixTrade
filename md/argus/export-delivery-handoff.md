# ARGUS Export / Delivery Layer — Handoff for Analysis

**Repository:** [MatrixTrade](https://github.com/argometal/MatrixTrade)  
**Module:** ARGUS at `/argus/*`  
**Production:** https://matrix-trade-theta.vercel.app  
**Date:** 2026-07-09  
**Status:** Quick Package (HTML + MD) + Evidence Vault v1 implemented — Relationship Brief and other packages remain proposed

Read with [`ai-charter.md`](ai-charter.md), [`correlation-guide.md`](correlation-guide.md), [`v2-design-checklist.md`](v2-design-checklist.md), [`model-alignment-audit.md`](model-alignment-audit.md), and [`README.md`](README.md).

---

## Purpose of this document

Provide ChatGPT (or another analyst) with enough context to analyze a proposed ARGUS **delivery/export** layer. The web app is the workspace; the final output should be an **evidence package**.

---

## ARGUS product loop (target)

```text
Receive → Organize → Correlate → Retrieve → Deliver
```

Today ARGUS is strong on **Receive**, **Organize**, **Correlate**, and **Retrieve**.  
**Deliver v1** is live: Quick Package (HTML + Markdown) and Evidence Vault (ZIP). See [`deliver-formats-plan.md`](deliver-formats-plan.md).

---

## What ARGUS is

ARGUS is a private professional journal / knowledge system:

- Capture evidence (emails, notes, files, journal entries)
- Link evidence to People, Organizations, Projects, Events, Topics
- Retrieve via v2 browsers, timelines, inbox, search
- **AI Charter:** every conclusion must trace to evidence; never fabricate

**Design docs in repo:**

- [`ai-charter.md`](ai-charter.md)
- [`correlation-guide.md`](correlation-guide.md)
- [`v2-design-checklist.md`](v2-design-checklist.md)
- [`model-alignment-audit.md`](model-alignment-audit.md) — notes future unified evidence table

---

## Current data model (v3)

Single graph stored in `ArgusData` (`journal.json` locally OR Supabase):

### Object types

1. **Entity** — `person` | `company` (org) | `project` | `other` (topic/event/document via notes prefix)
2. **Log** — journal entry (`kind`: `log` | `event` | `follow_up`)
3. **InboxItem** — email/intake evidence (`status`: `pending` | `linked` | `converted` | `archived`)
4. **Attachment** — file metadata + bytes (parent: inbox or journal)

### Primary links

| Link | Description |
|------|-------------|
| `Log.entityIds[]` | → Entity (many-to-many) |
| `InboxItem.linkedEntityIds[]` | → Entity (many-to-many) |
| `Log.inboxItemId` | → InboxItem (journal provenance from email) |
| `InboxItem.convertedLogId` | → Log (when inbox converted to journal) |
| `Log.attachmentIds[]` | → Attachment |
| `InboxItem.attachmentIds[]` | → Attachment |
| `Attachment.parentType` + `parentId` | → inbox or journal parent |

### Key metadata

- **Timestamps:** `createdAt`, `updatedAt`, `receivedAt`, `log.date`, `deletedAt` (soft delete)
- **Sources:** `log.source` (`manual` \| `inbox` \| `email` \| `file`), `inbox.source` (`manual` \| `api` \| `email` \| `file`)
- **Privacy:** `log.private`, `inbox.private` (PIN-gated)
- **Topics:** `log.topics[]` (free-form tags)
- **Classification:** `log.classificationStatus` (`classified` \| `needs_classification`)
- **Email:** `rawEmail` JSON (`from`, `to`, `subject`, `text`, `html`, `receivedAt`)

### No first-class types for

- Decision
- Lesson learned
- Recognition / achievement
- Legal hold / chain of custody
- Export audit record

---

## Existing retrieval code (reusable for export)

| Path | Role |
|------|------|
| `lib/argus/entity-evidence.ts` | Entity-scoped logs + inbox |
| `lib/argus/inbox-entity-links.ts` | Inbox linked to entity, evidence counts |
| `lib/argus/project-evidence.ts` | Project evidence loaders |
| `lib/argus/project-evidence-scope.ts` | Direct + via-contact project scope, date-bounded |
| `lib/argus/v2/hierarchy.ts` | **Lens rules (critical):** org/person direct-only; project via `linkedPersonIds`, date-bounded |
| `lib/argus/v2/timeline-builders.ts` | Merge logs + inbox into chronology |
| `lib/argus/inbox-enrich.ts` | Enrich inbox with email view model |
| `lib/argus/email-view.ts` | Parse `StoredEmailPayload`, attachment URLs |
| `lib/argus/network.ts` | `getEntityHistory`, follow-ups, related entities |
| `lib/argus/network-intelligence.ts` | `outcomeScore` (regex heuristics), relationship health |
| `lib/argus/context.ts` | Co-mention / related entity graph |
| `lib/argus/server-storage.ts` | `readArgus()`, `readAttachmentBytes()`, `getLog()`, etc. |
| `app/api/argus/files/[id]/route.ts` | Authenticated single-file download |

---

## Existing export / backup (limited)

| Path | Role |
|------|------|
| `lib/argus/supabase-protection/export.ts` | `exportArgusSupabaseTables()` → timestamped JSON of inbox + attachments metadata + journal blob; does **not** bundle attachment file bytes in one package |
| `lib/argus/data-safety/backup.ts` | Rotating local `journal.json` backups |
| `tools/backup-argus-supabase.ts` | CLI Supabase export |
| `GET /api/argus/files/{id}` | Per-file download only |

### Not implemented

- ZIP export packages
- PDF report generation (only inline preview for images/PDF)
- Entity-scoped export bundles
- Import format for portable archives
- Tamper-evident manifests / hashes
- Redaction workflow

---

## Proposed export modes (5 packages)

### 1. Recognition Report

- **Audience:** promotion / review / management
- **Contents:** projects, contributions, timeline, evidence references, attachments
- **Use case:** demonstrate professional achievements from evidence

### 2. Incident Package

- **Audience:** HR / legal / investigation
- **Contents:** chronology, emails, journal, decisions, people, documents
- **Requirements:** timestamped, read-only, high integrity

### 3. Knowledge Package

- **Audience:** handover / technical learning
- **Contents:** topic/project lessons, timeline, documents, related evidence
- **Use case:** transfer knowledge when leaving a project or role

### 4. Relationship Brief

- **Audience:** meeting preparation
- **Contents:** person timeline, prior interactions, projects, orgs, topics, follow-ups
- **Use case:** prepare for a call or meeting with context

### 5. Evidence Vault

- **Audience:** backup / portable archive / future import
- **Contents:** linked data + files + metadata
- **Use case:** portable backup; future re-import into ARGUS

---

## Package-by-package: data available vs missing

### 1. Recognition Report

**Available:**

- Projects linked to person via `entityIds` / `linkedEntityIds`
- Timeline: `buildTimelineFromLogsAndInbox()`
- Evidence refs: log IDs, inbox IDs, attachment IDs
- Attachments via `readAttachmentBytes()`
- Heuristic `outcomeScore` from `network-intelligence.ts` (regex on journal text)

**Missing:**

- Formal "contribution" or "achievement" taxonomy
- Curated narrative sections (must not fabricate per AI Charter)
- Multi-project roll-up for one person with review-period filter
- Manager-safe redaction
- PDF layout / polished report template

**Risk:** Medium-high (HR sensitivity, narrative temptation)

### 2. Incident Package

**Available:**

- Full chronology with timestamps
- Emails: `rawEmail`, headers, `receivedAt`
- Journal logs with entity links
- People, orgs, projects via entity graph
- Documents: attachment files + document entities
- "Decisions" only inferable from journal text (no Decision type)

**Missing:**

- Chain of custody
- Export audit log (who exported what when)
- Cryptographic manifest / tamper evidence
- Legal hold flags
- Redaction workflow
- Dedup when same email exists as inbox item **and** converted journal

**Risk:** Highest (legal-grade requirements not met)

### 3. Knowledge Package

**Available:**

- Project-scoped evidence: `getProjectEvidenceScope()` (best join logic in repo)
- Topic entities + `log.topics`
- Timeline + attachments
- Related people/orgs via `linkedEntityIds`, `linkedPersonIds`

**Missing:**

- Structured "lessons learned" field
- Handover document template
- Clear separation: interpretation vs raw evidence

**Risk:** Low-medium

### 4. Relationship Brief

**Available:**

- Person timeline: `personEvidenceScope()` + `getEntityHistory`
- Prior interactions: `EntityNetworkView`, `network-intelligence`
- Linked projects, orgs, topics
- Follow-ups: `log.kind === "follow_up"`

**Missing:**

- Meeting agenda template
- AI-generated talking points (would need strict evidence citations)
- Calendar integration

**Risk:** Lowest (single entity, read-only, factual assembly)

### 5. Evidence Vault

**Available:**

- Full metadata: `readArgus()` or `exportArgusSupabaseTables()`
- Attachment metadata in `ArgusData` / `argus_attachments`
- Attachment bytes: local `files/` or Supabase `argus-files` bucket
- Partial restore path for Supabase JSON

**Missing:**

- Unified `.argus` archive format
- ZIP bundling metadata + all file bytes
- Versioned manifest schema
- Scoped export (person/project/org) vs full vault
- Import validation for portable packages

**Risk:** Low (foundation layer)

---

## Recommended build order (lowest risk first)

1. **Evidence Vault** (scoped ARGUS Archive) — foundation for all others
2. **Relationship Brief** — smallest lens, high value, read-only
3. **Knowledge Package** — project-scoped; reuses `project-evidence-scope`
4. **Recognition Report** — needs period selection + careful presentation
5. **Incident Package** — needs legal-grade manifest, dedup, redaction, audit trail

---

## Suggested output formats

### Primary (Phase 1)

- ARGUS Archive JSON manifest (versioned schema, source of truth)
- ZIP container: `manifest.json` + `evidence/` + `files/{attachmentId}`

### Secondary (Phase 2)

- HTML read-only views (print to PDF via browser — avoid server PDF initially)

### Tertiary (Phase 3)

- Server-generated PDF for polished Recognition / Incident packages

**Avoid PDF-first:** no PDF library in repo today; PDF is presentation, not evidence.

```text
JSON = truth. ZIP = delivery. HTML = human view. PDF = external polish.
```

---

## Proposed architecture (aligned with current repo)

Do **not** put export logic in React components.  
Add server-side delivery layer reusing existing retrieval primitives:

```text
lib/argus/export/                    (NEW)
  types.ts                           ExportPackageKind, ExportManifest, ExportScope
  collect-evidence.ts                Single collector: hierarchy + dedup + private filter
  dedup.ts                           inbox ↔ journal via inboxItemId / convertedLogId
  manifest.ts                        Versioned manifest + SHA-256 file hashes
  packages/
    vault.ts
    relationship-brief.ts
    knowledge-package.ts
    recognition-report.ts            (later)
    incident-package.ts              (later)
  writers/
    json-writer.ts
    zip-writer.ts                    streams from readAttachmentBytes()
    html-writer.ts                   (phase 2)

app/api/argus/export/route.ts        POST { package, anchorId?, from?, to?, includePrivate }
```

### Principles

1. **One collector, many assemblers** — package types differ in scope + presentation only
2. **Lens rules stay in `hierarchy.ts`** — do not duplicate
3. **Manifest-first** — every ZIP has `exportedAt`, `exportedBy`, `packageType`, `scope`, `evidenceIndex`, hashes
4. **Dedup before deliver** — inbox + converted journal = one canonical row + cross-refs
5. **Private gate** via `private-access.ts`
6. **No new DB schema for v1** — stateless export generation
7. **UI entry:** Export button on v2 person / project / org detail (later)

---

## Critical gaps (all packages)

- No Decision entity type
- Email duplicate: inbox item may also exist as journal (`inboxItemId` / `convertedLogId`)
- Attachments split: local FS vs Supabase bucket (abstract via `readAttachmentBytes`)
- No export audit trail
- No redaction for HR/legal
- `outcomeScore` is heuristic regex — not factual scoring

---

## Recent related work (context)

**Change 140 (in progress):** Inbox → unified Create/Link flow

- Email stays in inbox as evidence (`pending`/`linked`, not converted)
- Optional journal created with `inboxItemId` cross-ref
- Relevant because export must handle dual inbox+journal evidence correctly

**v2 UI:** browsers for org/project/network/topics/events, inbox v2, Create/Link window  
**Checklist v1.2:** coded vs user-reviewed audit ([`v2-design-checklist.md`](v2-design-checklist.md))

---

## Questions for ChatGPT to analyze

1. Is the proposed 5-package taxonomy complete, or should packages be merged/split?
2. What should the `manifest.json` schema contain for v1 (fields, versioning, integrity)?
3. How should deduplication work when email exists as both `InboxItem` and `Log`?
4. What is the minimum viable Evidence Vault for import/export round-trip?
5. Which package delivers the most user value per engineering effort?
6. What legal/HR requirements must Incident Package meet before it is safe to ship?
7. Should Recognition Report use AI summarization, and if so, what guardrails?
8. HTML+print vs server PDF — tradeoffs for this stack (Next.js 15, Vercel)?
9. How to handle private/PIN-gated records in exports?
10. Does this architecture conflict with [`model-alignment-audit.md`](model-alignment-audit.md) future `argus_evidence` table?
11. Suggested API design: sync vs async export for large ZIPs?
12. Redaction strategy: pre-export filter vs post-export tooling?

---

## Key file paths (repo)

| Path | Role |
|------|------|
| `lib/argus/types.ts` | Core types |
| `lib/argus/server-storage.ts` | Read/write primitives |
| `lib/argus/entity-evidence.ts` | Entity evidence scope |
| `lib/argus/inbox-entity-links.ts` | Inbox ↔ entity joins |
| `lib/argus/project-evidence-scope.ts` | Project lens |
| `lib/argus/v2/hierarchy.ts` | Lens rules |
| `lib/argus/v2/timeline-builders.ts` | Chronology |
| `lib/argus/network-intelligence.ts` | Relationship heuristics |
| `lib/argus/supabase-protection/export.ts` | Current Supabase export |
| `lib/argus/inbox-enrich.ts` | Email enrichment |
| `lib/argus/email-view.ts` | Email view model |
| `app/api/argus/files/[id]/route.ts` | File download |
| `md/argus/ai-charter.md` | AI rules of construction |
| `md/argus/model-alignment-audit.md` | Future evidence model |

---

*End of handoff*
