# 10 — Source index

Traceability only. Each statement points to repository evidence.

| # | Statement | Source |
|---|-----------|--------|
| 1 | ArgusData version is 3 | `lib/argus/types.ts` (`version: 3` on `ArgusData`) |
| 2 | EntityType union person\|company\|project\|other | `lib/argus/types.ts` |
| 3 | JournalKind log\|event\|follow_up | `lib/argus/types.ts` |
| 4 | Creatable ReferenceKind includes topic and event | `lib/argus/reference-types.ts` |
| 5 | Topic/Event stored as type other + Kind prefix | `lib/argus/reference-types.ts` (`buildReferenceNotes`) |
| 6 | Vocabulary: Topic / Tag / Alias / Signal | `md/argus/vocabulary-policy.md` |
| 7 | Aliases never Patterns; Signals copy to evidence on chronicle save | `md/argus/vocabulary-policy.md` |
| 8 | Patterns from evidence tags ≥3 and ≥1 in 90d | `md/argus/tag-patterns-vision.md`, `lib/argus/tag-limits.ts`, `lib/argus/v2/tag-patterns.ts` |
| 9 | Tag patterns ignore entity linkedTags | `lib/argus/v2/tag-patterns.ts` (counts log/inbox topics only) |
| 10 | Product loop Receive→Organize→Correlate→Retrieve→Deliver | `md/argus/README.md` |
| 11 | Alternate loop Receive→Register→Link→Retrieve→Deliver | `md/argus/how-argus-works.md` |
| 12 | Constitution: Inbox/Journal/Network/Search roles | `md/integrations/argus-architecture.md` |
| 13 | Constitution: Event/Follow-up derived; open Event questions | `md/integrations/argus-architecture.md` |
| 14 | Events browse UI exists | `app/argus/v2/browse/events/` |
| 15 | server-storage is read/write façade | `lib/argus/server-storage.ts`; `md/integrations/argus-storage.md` |
| 16 | Local layout journal.json + files/ | `md/integrations/argus-storage.md` |
| 17 | Cloud journal table argus_journal | `supabase/argus-journal.sql` |
| 18 | Cloud inbox tables | `supabase/argus-inbox.sql` |
| 19 | Soft-delete protection SQL | `supabase/argus-protection.sql` |
| 20 | v01 schema is draft for review only | `supabase/argus-v01-schema.sql` header |
| 21 | v01 not wired as runtime | `md/argus/model-alignment-audit.md` |
| 22 | Lens rules org/person/project/topic-event | `md/argus/README.md`; `lib/argus/v2/hierarchy.ts` |
| 23 | Export Evidence Vault API | `app/api/argus/export/route.ts`; `md/argus/README.md` |
| 24 | Deliver v1 shipped (handoff wording) | `md/argus/export-delivery-handoff.md` |
| 25 | Deliver only partially built (README weakness #4) | `md/argus/README.md` |
| 26 | Known weaknesses 1–7 | `md/argus/README.md` |
| 27 | Model alignment conflicts C1–C7 | `md/argus/model-alignment-audit.md` |
| 28 | Delete gates | `lib/argus/delete-gate.ts`, `delete-link-check.ts` |
| 29 | Write gate | `lib/argus/data-safety/write-gate.ts` |
| 30 | Private access filters | `lib/argus/private-access.ts` |
| 31 | Inbox API token auth | `app/api/argus/inbox/route.ts` |
| 32 | Email inbox route | `app/api/argus/email-inbox/route.ts` |
| 33 | Topic loaders build patterns from topic-scoped evidence | `lib/argus/v2/topic-loaders.ts` |
| 34 | Intelligence may roll up linked-event evidence volume | `lib/argus/v2/intelligence-viz.ts` (`countEvidenceForTopicIncludingEvents`) |
| 35 | Chronicle append creates log with entityIds [eventId] | `app/argus/actions.ts` (`appendEventChronicleEntryAction`) |
| 36 | Trading shares auth only | `md/integrations/argus-architecture.md` |
| 37 | File counts app 172 / lib 128 / api 8 | `find` inventory 2026-08-06 |
| 38 | 73 server action exports | `rg "^export async function " app/argus/actions.ts` |
| 39 | No TODO/FIXME in Argus trees | ripgrep 2026-08-06 |
| 40 | Lib→App reverse imports | `create-flow-types.ts`, `create-link-flow-state.ts`, `link-modal-adapter.ts`, `network-contact-loaders.ts` |
| 41 | Package uses: next, react, supabase-js, archiver, pdfkit | imports under Argus trees |
| 42 | Attachment has parentType/parentId | `lib/argus/types.ts` |
| 43 | Constitution Attachment parent gap statement | `md/integrations/argus-architecture.md` |
| 44 | Person detail route exists | `app/argus/v2/network/[id]/page.tsx` |
| 45 | Checklist Person detail Deferred and Implemented | `md/argus/v2-checklist-solutions.md` |
| 46 | Guest lock modules | `lib/auth/guest-workstation-lock.ts`, `guest-lock-policy-edge.ts` |
| 47 | This pack path | `md/argus-review/` |
| 48 | Actual branch name | `cursor/chatgpt-argus-review-e1a0` |
| 49 | IA-requested branch name | prompt text: `chatgpt/argus-review` |
| 50 | Evidence scratch notes | `md/argus/architecture-review-evidence-notes.md` |

---

## Line references

Where a precise line was verified during extraction, it appears in `md/argus/architecture-review-evidence-notes.md` or in the cited file.  
If a row above lacks a line number: treat the **file path** as the binding source; line numbers may drift — re-open the file.

---

## UNKNOWN items (explicit)

| Item | Status |
|------|--------|
| Production which SQL migrations applied | UNKNOWN |
| True webpack/turbopack import cycle | UNKNOWN |
| In-memory ArgusData cache across requests | UNKNOWN |
| Full 73-action execution-order matrix | UNKNOWN (not expanded) |
| Exact body purpose of every v2 component | UNKNOWN beyond export/file names |
