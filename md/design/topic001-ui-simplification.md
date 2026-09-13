# topic001 — Topic UI simplification (draft)

**Status:** Draft for evaluation — **not** wired into live A06.  
**Access:** [`/argus/v2/drafts/topic001`](/argus/v2/drafts/topic001) (Argus login)  
**Also linked from:** Help · Diagnostics

## Goal

Recover **~30–40% vertical viewport** before Chronicle / Runbooks by trimming Topic chrome — without changing architecture, loaders, ontology, or Chronicle/Runbooks internals.

## Slices

| Slice | Scope | In topic001 draft |
|-------|--------|-------------------|
| **A** | Topic detail header trim | Yes — After mock |
| **B** | Topics browse toolbar (no Summary Pills) | Yes — After mock |
| **C** | Naming (journals → Notes, files → Attachments) | Later |

## Slice A — keep / drop

**Drop from expanded header:** 4 metric pills · large action row · vertical Patterns block · long description by default.

**Keep compact:** name + category · Deliver/Link/Create in `···` · Patterns as one-line chips · metrics as `8 notes · 4 emails · 3 events` · tabs immediately under title.

## Slice B

Replace five Summary Pills with a segmented status row on the same toolbar as search / Filters / Grid·List·Manage / +Topic. Filtering logic and URLs unchanged when wired.

## Approval gate

Approve density on the draft → then substitute into `V2TopicDetailPanel` / `V2TopicsShell`. Do not ship Slice C or Chronicle/Runbooks rewrites in that pass.
