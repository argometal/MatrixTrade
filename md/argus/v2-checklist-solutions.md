# ARGUS v2 Checklist — Solutions map

**Companion to:** [`v2-design-checklist.md`](v2-design-checklist.md)  
**Design version:** 1.1 (post second-origin checkpoint)  
**Last updated:** 2026-07-06

Each checklist item is classified:

| Type | Meaning |
|------|---------|
| **QA** | Already implemented — user verifies in browser |
| **Fixed** | Code/doc change in Change 132+ |
| **Partial** | Improved but not full mockup scope |
| **Deferred** | Intentionally later; by design |

---

## Global shell

| Checklist item | Solution |
|----------------|----------|
| Sidebar layout / padding / footer | **QA** — Change 125; verify at `lg+` |
| Nav counts & routes | **Fixed** — Network + People → `/argus/v2/browse/network` |
| Follow Ups nav | **Fixed** — `/argus/v2#follow-ups` |
| Reminders nav | **Partial** — `/argus/journal` until v2 reminders view |
| Tags nav | **Fixed** — `/argus/v2#tags` |
| Search field | **Fixed** — GET form → `/argus/search`; ⌘K shortcut |
| PIN button | **Fixed** — `PrivateLockMenu` when `ARGUS_PRIVATE_PIN` set |
| Notification bell | **Fixed** — live inbox count → `/argus/v2/inbox` |
| Profile avatar | **Deferred** — static until user profile model |
| Mobile nav | **QA** — verify routes + inbox badge |
| Auth / private / live data | **QA** — session + `readArgus`; PIN unlock |

---

## Home preview

| Checklist item | Solution |
|----------------|----------|
| Header, stat cards, panels | **QA** — wired to loaders |
| Recent Entities org tab URL | **Fixed** — `/argus/v2?tab=organizations` |
| Follow Ups / Tags anchors | **Fixed** — `#follow-ups`, `#tags` |
| All other home sections | **QA** |

---

## Browsers (Organizations, Projects, Network)

| Checklist item | Solution |
|----------------|----------|
| Card data & navigation | **QA** — browse utils + live data |
| Org/Project **Filters** | **Fixed** — `V2BrowseStatusFilter` by status |
| Network Filters button | **Partial** — use status tabs + smart filters (button redundant) |
| Network smart views / pagination | **QA** |

---

## Inbox v2

| Checklist item | Solution |
|----------------|----------|
| Layout, tabs, link modal | **QA** — Changes 126–127 |
| Unlink / replace links | **Fixed** — `setInboxLinkedEntities` + `setInboxLinksAction` |
| Tag picker / convert / archive | **QA** — existing actions; verify per email |

---

## Detail pages (Org, Project, Person legacy)

| Checklist item | Solution |
|----------------|----------|
| Org / Project detail | **QA** — hierarchy rules in `loaders.ts` |
| Person v2 shell | **Deferred** — `/argus/network/[id]` until v2 person page |

---

## Topics / Events browse

| Checklist item | Solution |
|----------------|----------|
| Master-detail shells | **QA** |

---

## Cross-cutting

| Checklist item | Solution |
|----------------|----------|
| Navigation philosophy | **QA** — routes aligned |
| Hierarchy data rules | **QA** — `hierarchy.ts` + tests in implementation report |
| AI Charter | **Fixed** — [`ai-charter.md`](ai-charter.md); strength from evidence |

---

## Known gaps — resolution status

| Gap | Resolution |
|-----|------------|
| Global search | **Fixed** — `/argus/search` + ⌘K |
| PIN | **Fixed** — when env configured |
| Notifications | **Fixed** — inbox count |
| Browser Filters | **Fixed** — org/project status filter |
| Inbox unlink | **Fixed** — replace semantics |
| Follow Ups route | **Fixed** — home anchor |
| Person detail v2 | **Deferred** — Phase 2 |
| Replace `/argus/journal` | **Deferred** — by design |

---

## Next deferred work (v1.2+)

1. v2 **Person detail** page (`/argus/v2/people/[id]`)
2. v2 **Reminders** and **Follow Ups** dedicated routes
3. In-app **search palette** (⌘K overlay without leaving v2)
4. **Profile** from session / user settings
5. Full **filter** panels (source, tags, date) on browsers

---

## Maintenance

When fixing an item, update:

1. This file (solution status)
2. [`v2-design-checklist.md`](v2-design-checklist.md) (checkbox or Known gaps)
3. Checklist maintenance log
