# 04 — Architecture

**Constraint:** Current architecture only. No proposals.

Sources: `md/integrations/argus-architecture.md`, `md/argus/README.md`, `lib/argus/*`, `app/argus/*`, `app/api/argus/*`.

Where documents disagree with code or each other, **both** are reported.

---

## Layers (from code structure)

```text
UI: app/argus/(app) | app/argus/v2 + components
  → server actions: app/argus/actions.ts
  → API routes: app/api/argus/*
      → lib/argus/server-storage.ts
          → local JSON (ARGUS_DATA_DIR) OR journal-store Supabase
          → inbox-store Supabase (when cloud)
          → data-safety write gate
      → lib/argus/export/* (deliver)
      → lib/argus/v2/* (view models)
Auth: @/lib/auth/* + middleware.ts
```

---

## Components and responsibilities (constitution)

From `md/integrations/argus-architecture.md` (Canonical — accepted constitution):

| Module | Owns data? | Purpose |
|--------|------------|---------|
| Inbox | Yes (raw) | Capture first |
| Journal | Yes (facts) | Source of truth |
| Network | No | Derived from Journal |
| Search | No | Global retrieval |

Accepted rules (`argus-architecture.md`):

| Decision | Rule |
|----------|------|
| **Inbox** | First-class object. Raw capture buffer. Always preserves original content. |
| **Journal** | Single source of truth for facts. |
| **Network** | Always derived from Journal. Never owns data. |
| **Search** | Cross-cutting retrieval. Not part of the data pipeline. |
| **Event / Follow-up** | Derived concepts — not primary user-facing types. Classification inferred from metadata (dates), not chosen upfront. |
| **Inbox raw content** | Immutable. Never modified after receipt. |
| **AI** | Annotates only. Never replaces original content. |

### Information flow (canonical, from constitution)

```text
Capture
   ↓
Inbox (optional — external/async input)
   ↓
Journal Entry (source of truth)
   ↔ Entity (references — may be deferred)
   ↓
Network (derived relationships + context)
   
Search ─── spans Inbox + Journal + Entity + Attachments (+ future annotations)
```

**Not a pipeline stage (constitution):** Search, Network, AI annotations.  
**Not downstream of Journal (constitution):** Entity is a reference dimension, not a processing step after Journal.

---

## Ownership

| Object | Role | First-class? | Source |
|--------|------|--------------|--------|
| **InboxItem** | Unclassified raw input | Yes | `argus-architecture.md`, `types.ts` |
| **Journal Entry** (`Log` in code v3) | Canonical fact | Yes | same |
| **Entity** | Stable identity | Yes | same |
| **Attachment** | Binary evidence | Yes | same |
| **Runbook** / **RunbookProgress** | Execution | Present in `ArgusData` | `types.ts` |
| **Network view** | Relationship intelligence from Journal | Derived | constitution |
| **Search results** | Query across modules | Derived | constitution |
| **Event / Follow-up views** | Filtered projections of Journal metadata | Derived (constitution) | constitution |
| **Relationship** | Pattern from shared Journal history | Derived | constitution |
| **Context** | Time-varying association | Derived | constitution / `EntityContextSlice` |

---

## Interfaces

| Interface | Path | Role |
|-----------|------|------|
| Server actions | `app/argus/actions.ts` | UI mutations; `requireArgusSession` |
| HTTP Inbox API | `POST /api/argus/inbox` | Token-authenticated create |
| HTTP Email inbox | `POST /api/argus/email-inbox` | Email intake |
| HTTP Files | `GET /api/argus/files/[id]` | Attachment bytes |
| HTTP Export | `POST /api/argus/export` | Evidence Vault / packages |
| HTTP Export preview | `POST /api/argus/export/preview` | Preview |
| HTTP Deliver quick | `/api/argus/deliver/quick` | Quick package |
| HTTP Deliver dossier | `/api/argus/deliver/dossier` | Dossier |
| HTTP Deliver share | `/api/argus/deliver/share` | Share |
| Storage façade | `lib/argus/server-storage.ts` | `readArgus`, `createEntity`, `createLog`, … |
| Storage paths | `lib/argus/storage/paths.ts` | `ARGUS_DATA_DIR` layout |
| Write gate | `lib/argus/data-safety/write-gate.ts` | `writeArgusSafe` |
| Auth session | `lib/auth/require-session.ts` | Session gate |
| Middleware | `middleware.ts` | Auth + legacy redirects |

Doc rule (`md/integrations/argus-storage.md`): UI must not import storage paths directly; all disk I/O via `storage/paths.ts`, `storage/bootstrap.ts`, `server-storage.ts`.

---

## Runtime vs target (documented, both current)

From `md/argus/README.md` “Runtime truth”:

| Layer | Today (v3 runtime) | Target (v01) |
|-------|-------------------|--------------|
| Storage | `ArgusData` in `journal.json` and/or Supabase | Unified `argus_evidence` + junctions |
| Journal | `Log` (`kind`: log \| event \| follow_up) | Evidence rows |
| Email | `InboxItem` statuses | Evidence + links |
| Entities | `Entity` polymorphic blob | Typed Person, Org, Project, Topic, Event |
| Topics | `log.topics[]` strings + topic entities | Topic table + tags separated |
| Code entry | `lib/argus/types.ts`, `server-storage.ts` | `supabase/argus-v01-schema.sql` (draft) |

---

## Lens rules (documented as implemented)

From `md/argus/README.md` → code `lib/argus/v2/hierarchy.ts`:

| Scope | Evidence rule |
|-------|---------------|
| Organization | Direct links only, all dates |
| Person | Direct links only, all dates |
| Project | Direct + via `linkedPersonIds`, date-bounded |
| Topic / Event | Direct links (entity id in `entityIds` / `linkedEntityIds`) |

---

## Product loop wordings (both present)

| Source | Loop text |
|--------|-----------|
| `md/argus/README.md` | `Receive → Organize → Correlate → Retrieve → Deliver` |
| `md/argus/how-argus-works.md` | `Receive → Register → Link → Retrieve → Deliver` |

---

## Documented disagreements (architecture facts)

| Topic | Statement A | Statement B |
|-------|-------------|-------------|
| **Event** | Constitution: Event = derived from `Log.kind`; open questions; do not redesign yet (`argus-architecture.md`) | Code: creatable `ReferenceKind` `"event"` (`reference-types.ts`); UI `app/argus/v2/browse/events/**`; loaders `lib/argus/v2/event-*`. Help text lists Event as entity type (`how-argus-works.md`) |
| **Deliver maturity** | README known weakness: “Deliver layer only partially built” | `export-delivery-handoff.md`: “Deliver **v1 shipped**” |
| **Attachment parent** | Constitution “Current gap”: parent only as ID arrays | `types.ts`: `Attachment` has `parentType` + `parentId` |
| **Place creatable** | model-alignment audit: still creatable in UI | `reference-types.ts`: place is legacy display-only, not in `REFERENCE_KINDS` |
| **Person detail v2** | `v2-checklist-solutions.md`: “Implemented” and “Deferred — Phase 2” in same file | Route exists: `app/argus/v2/network/[id]/page.tsx` |
| **Architecture implementation status line** | `argus-architecture.md`: “v2 shell, inbox, network metrics, and Evidence Vault v1 are **in progress**” | Export handoff: v1 shipped |

---

## Auth / session ownership

| Concern | Module |
|---------|--------|
| Argus session | `lib/auth/require-session.ts`, cookies |
| Private unlock | `lib/auth/passwords.ts`, `private-access.ts` |
| Delete unlock / TOTP | `lib/auth/totp.ts`, `delete-gate.ts` |
| Guest workstation lock | `lib/auth/guest-workstation-lock.ts`, `guest-lock-policy-edge.ts` |

---

## Separation from Trading

`md/integrations/argus-architecture.md`: Trading and ARGUS share auth only — no shared business logic or data.
