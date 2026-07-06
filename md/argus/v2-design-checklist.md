# ARGUS v2 Design Checklist

**Design version:** 1.1  
**Last updated:** 2026-07-06  
**Checkpoint branch:** `second-origin`  
**Solutions map:** [`v2-checklist-solutions.md`](v2-checklist-solutions.md)
**Preview entry:** `/argus/v2`  
**Production UI (unchanged):** `/argus/journal`, `/argus/network`, etc.

**Protocol (mandatory updates):** [`checklist-protocol.md`](checklist-protocol.md) — update this file on every v2 UI change.

---

## How to use this checklist

1. **When a new screen or component is designed**, add or update its section here before calling the work done ([`checklist-protocol.md`](checklist-protocol.md)).
2. **You check each box** after verifying on local (`http://localhost:3002`) or production (`https://matrix-trade-theta.vercel.app`).
3. **On any redesign**, bump the design version, reset unchecked items, and re-verify everything affected.
4. **Sign-off** at the bottom when a version is accepted.
5. **Builders / AI:** add a row to *Checklist maintenance log* with every change — do not skip.

Mark items:

- `[ ]` — not verified  
- `[x]` — verified working (user QA)  
- `[~]` — placeholder / partial (note in *Known gaps*)

---

## Checklist maintenance log

| Date | Change | Checklist update |
|------|--------|------------------|
| 2026-07-06 | **Checklist v1.0 created** | Full v2 preview: shell, Home, browsers, inbox, detail pages |
| 2026-07-06 | Change 126 | Inbox link modal size — Inbox v2 → Link modal items |
| 2026-07-06 | Change 127 | **+ Link** in email header — Inbox v2 → Detail panel header |
| 2026-07-06 | Change 128 | Projects browser — Projects browser section |
| 2026-07-06 | Change 129 | Organizations browser — Organizations browser section |
| 2026-07-06 | Network browser (local) | Network browser section + sidebar nav to `/argus/v2/browse/network` |
| 2026-07-06 | AI Charter + protocol docs | Cross-cutting → AI Charter alignment; `checklist-protocol.md` added |
| 2026-07-06 | **Change 132 / second-origin** | Checklist fixes: inbox unlink, search, PIN, filters, nav anchors; `v2-checklist-solutions.md` |
| 2026-07-06 | **Change 133** | Unified create+link (`CreateAndLinkModal`); event/project link counts; network empty-state CTA |
| 2026-07-06 | **Change 134** | Unrestricted link targets (all 5 types); link modal inline create; picker fixes |
| 2026-07-06 | **Change 135** | `ArgusUnifiedCreateFlow` — single + Create window (journal/person/org/project/event/topic/document + link + inline missing + save) |
| 2026-07-06 | **Change 136** | `ArgusCreateLinkWindow` full-screen mockup UI; shared flow state hook; all + Create buttons open it |
| 2026-07-06 | **Change 137** | Portal fix for create window (z-9999); Network browser mockup layout; `/argus/network` → v2 |

*Add a row here whenever v2 UI or checklist changes.*

---

## Global shell (`/argus/v2/*`)

**Route:** all v2 pages · **Files:** `layout.tsx`, `V2Sidebar.tsx`, `V2TopBar.tsx`, `V2MobileNav`

### Layout & navigation

- [ ] Left sidebar visible on `lg+`; does not overlap main content
- [ ] Content column has correct left padding (`lg:pl-56`, `xl:pl-60`)
- [ ] Argus logo + tagline in sidebar footer (“Live data · v2 preview”)
- [ ] Link to legacy production UI (`/argus/journal`) in sidebar footer

### Sidebar — Capture

- [ ] **Inbox** nav item shows live count
- [ ] Inbox nav highlights on `/argus/v2/inbox`

### Sidebar — Browse

- [ ] **Organizations** → `/argus/v2/browse/organizations`; active on org browse + org detail
- [ ] **Projects** → `/argus/v2/browse/projects`; active on project browse + project detail
- [ ] **People** → `/argus/v2/browse/network`
- [ ] **Topics** → `/argus/v2/browse/topics`
- [ ] **Events** → `/argus/v2/browse/events`
- [ ] Counts match live data (orgs, projects, people, topics, events)

### Sidebar — Intelligence

- [ ] **Network** → `/argus/v2/browse/network`; active on network browse + person detail (`/argus/network/[id]`)
- [ ] Follow Ups / Reminders / Tags nav items present (may still route to legacy)

### Top bar

- [ ] Sticky header with blur on scroll
- [ ] Search field visible on desktop (placeholder “Search anything…”)
- [ ] **+ Create** opens unified create & link flow (`ArgusUnifiedCreateFlow` via `ArgusAddProvider`)
- [ ] Mobile: compact Argus title visible when sidebar hidden

### Top bar — placeholders (expect `[~]`)

- [~] Search navigates to `/argus/search`; ⌘K shortcut (in-app palette deferred)
- [~] PIN uses `PrivateLockMenu` when `ARGUS_PRIVATE_PIN` configured; otherwise disabled hint
- [x] Notification bell shows live inbox count
- [~] Profile avatar is static (“VA”)

### Mobile bottom nav

- [ ] Floating dock visible below `lg` breakpoint
- [ ] Home, Network, Inbox, Search icons navigate correctly
- [ ] Inbox badge shows live pending count

### Auth & data

- [ ] `/argus/v2` requires ARGUS session (redirects to login when configured)
- [ ] Protected/private records hidden until PIN unlock (when enabled)
- [ ] v2 reads live data (`readArgus` + inbox), not mock data

---

## Home preview (`/argus/v2`)

**File:** `app/argus/v2/page.tsx`  
**Purpose:** *What requires attention today?*

### Header

- [ ] Title “Home” + subtitle “Overview of your knowledge base · live counts”
- [ ] **Legacy journal →** link opens `/argus/journal`

### Stat cards (5-up grid)

- [ ] **Journal Entries** — live count + “this week” delta; links to `/argus/journal`
- [ ] **Emails** — live inbox count + delta; links to `/argus/v2/inbox`
- [ ] **People** — live people count; links to `/argus/v2/browse/network`
- [ ] **Organizations** — live org count; links to `/argus/v2/browse/organizations`
- [ ] **Projects** — live project count; links to `/argus/v2/browse/projects`
- [ ] Hover state (violet border) on each card

### Recent Activity panel

- [ ] Shows latest journal / email / meeting activity from live data
- [ ] Each row links to correct detail (log, inbox, etc.)
- [ ] **View all** → `/argus/journal`
- [ ] Empty state when no activity

### Follow Ups panel

- [ ] Shows pending follow-ups with tone badges (danger / warning / muted)
- [ ] Each row links to source entry
- [ ] **View all** → `/argus/journal`
- [ ] Empty state when none pending

### Recent Entities table

- [ ] Tab strip: Organizations · Projects · People · Topics · Events
- [ ] Tab switches entity list (URL `?tab=` for org/project/people on home)
- [ ] Topics tab navigates to `/argus/v2/browse/topics`
- [ ] Events tab navigates to `/argus/v2/browse/events`
- [ ] Columns: Name, Type, Role/Links/People, Last Activity
- [ ] Active dot on rows with recent activity
- [ ] Row links open correct v2 or legacy detail page

### Timeline (right rail / mobile)

- [ ] Desktop (`xl+`): vertical timeline rail in right column
- [ ] Mobile: full-width timeline card below main grid
- [ ] Entries from merged logs + inbox chronology
- [ ] Empty state when no entries

### Tags cloud

- [ ] Tags from journal entries with counts
- [ ] Color chips render correctly
- [ ] Empty state when no tags

---

## Organizations browser (`/argus/v2/browse/organizations`)

**Files:** `organization-browse-utils.ts`, `V2OrganizationsBrowserShell.tsx`  
**Purpose:** *Which organization do I want to analyze?*

### Header & controls

- [ ] Title + building icon + subtitle
- [ ] **+ Organization** opens create modal; navigates to new org detail after save
- [ ] Grid / list view toggle works
- [ ] Filters button visible (placeholder OK)

### Summary row

- [ ] Total Organizations, Active, Inactive, Archived, Total Projects — live counts

### Organization cards (grid)

- [ ] Initials avatar, name, status badge (Prospect / Active / Inactive / Archived)
- [ ] Description from notes (truncated)
- [ ] Six metrics: Projects, People, Journal, Emails, Files, Topics
- [ ] Last contact label + relative time
- [ ] Relationship age (e.g. `1y 3m`)
- [ ] Activity sparkline (`V2RelationshipChart`) — last 12 months
- [ ] Card opens `/argus/v2/organizations/[id]`

### List view

- [ ] Compact rows with key metrics
- [ ] Same navigation as grid

### Right sidebar — “How to read this page”

- [ ] Visible on `xl+`
- [ ] Explains overview, metrics, last contact, relationship age, trend, actionable selection
- [ ] Tip box about filters

### Footer

- [ ] “Showing X to Y of Z organizations” text accurate

---

## Projects browser (`/argus/v2/browse/projects`)

**Files:** `project-browse-utils.ts`, `V2ProjectsBrowserShell.tsx`  
**Purpose:** *Which engagement do I want to open?*

### Header & controls

- [ ] Title + subtitle
- [ ] **+ Project** create flow
- [ ] Grid / list toggle
- [ ] Filters placeholder

### Summary row

- [ ] Total, Active, Planning, On Hold, Completed, Archived

### Project cards

- [ ] Status badge + date range
- [ ] Description
- [ ] Metrics: People, Journal, Emails, Files, Topics
- [ ] Last activity block
- [ ] Duration progress bar (when start/end dates exist)
- [ ] Team avatar preview + overflow count
- [ ] Opens `/argus/v2/projects/[id]`

### Footer section

- [ ] “Why this view helps” explainer block

---

## Network browser (`/argus/v2/browse/network`)

**Files:** `network-browse-utils.ts`, `V2NetworkBrowserShell.tsx`  
**Purpose:** *Who should I talk to, trust, or involve?*

### Header & controls

- [ ] Title + subtitle (“professional network”)
- [ ] **+ Person** create flow → `/argus/network/[id]`
- [ ] Grid / list toggle
- [ ] Filters placeholder

### Status tabs

- [ ] All People, Active, Dormant, New, Lost — counts + filter correctly

### Summary row

- [ ] Total People, Active (+ %), Organizations, Projects Together, Emails Exchanged, Interactions Logged

### Person cards

- [ ] Avatar initials, name, status badge
- [ ] Role + organization (when linked)
- [ ] Expertise tags from journal topics
- [ ] Last interaction + relationship since
- [ ] **Strength %** bar — computed from evidence (not manual)
- [ ] Footer metrics: Emails, Journal, Events
- [ ] Opens `/argus/network/[id]`

### Right sidebar analytics

- [ ] Status donut (Active / Dormant / New / Lost)
- [ ] Top organizations bar chart
- [ ] Average relationship strength
- [ ] Recent interactions feed

### Smart filters

- [ ] Key influencers, Decision makers, Technical experts, Recent activity, High value network, Dormant
- [ ] Each shows people count; clicking filters the grid
- [ ] Filters are views only (no new objects created)

### Pagination

- [ ] 8 cards per page; page controls when > 8 people

---

## Inbox v2 (`/argus/v2/inbox`)

**Files:** `V2InboxShell.tsx`, `V2InboxDetailPanel.tsx`, `V2InboxEntityLinkModal.tsx`

### List panel

- [ ] Three-column layout on desktop; list + detail without sidebar overlap
- [ ] Tabs: All, Unread, In Progress, Processed, Archived — counts + filter
- [ ] Filter chips row visible (placeholders OK)
- [ ] Select mode + bulk actions UI present
- [ ] Click row selects email; updates URL `?selected=`

### Detail panel — header

- [ ] **+ Link** opens “Link email” modal (not bottom of page)
- [ ] Share / ··· menu placeholders OK
- [ ] Subject, from, date, status displayed

### Detail panel — linking

- [ ] Link modal: tabs All / People / Orgs / Projects / Topics / Events
- [ ] Search within modal
- [ ] Multi-select entities
- [ ] Inline create entity from modal
- [ ] Save persists links to server
- [ ] Linked entities shown in header area with remove action

### Detail panel — known gaps

- [x] **Unlink / replace all links** persists correctly (`setInboxLinksAction`)
- [ ] Tag picker saves tags on email
- [ ] Convert to journal / archive / process actions work

### Email body

- [ ] HTML / text body renders
- [ ] Attachments list visible

---

## Organization detail (`/argus/v2/organizations/[id]`)

**Purpose:** *Everything we know about this company across years.*

### Header

- [ ] Back link → organizations browser
- [ ] Org name, edit link, location/website from notes when present
- [ ] Status badge, relationship chart sparkline

### Main column

- [ ] Tab strip (Overview / Timeline / … per `V2OrgTabs`)
- [ ] Forever timeline — **direct org links only** (not all people activity)
- [ ] Timeline entries link to evidence

### Right panel

- [ ] Summary stat cards (journal, emails, files, topics, etc.)
- [ ] Linked **people roster** (not evidence proxy)
- [ ] Linked projects list
- [ ] Contact pills / metrics rows
- [ ] Legacy network link for full edit view

---

## Project detail (`/argus/v2/projects/[id]`)

**Purpose:** *Everything that happened during that engagement.*

### Header

- [ ] Back link → projects browser
- [ ] Project name, status badge, date range
- [ ] Edit link → legacy `/argus/projects/[id]`

### Main column

- [ ] Tabs per `V2ProjectTabs`
- [ ] Bounded timeline — direct + via project contacts within dates
- [ ] Key metrics row

### Right panel

- [ ] Organization link (when linked)
- [ ] Team list with roles
- [ ] Topics / events counts
- [ ] Legacy project link

---

## Topics browser (`/argus/v2/browse/topics`)

- [ ] Master-detail layout (list + detail)
- [ ] Tabs: All, My topics, Followed
- [ ] Tag chips filter row
- [ ] Detail shows linked orgs, projects, people counts
- [ ] **+ Capture** opens journal sheet scoped to topic
- [ ] Links to legacy network for linked people

---

## Events browser (`/argus/v2/browse/events`)

- [ ] Master-detail layout
- [ ] Tabs: All, Upcoming, Past
- [ ] Grouped by date in list
- [ ] Detail shows participants, linked entities
- [ ] **+ Capture** opens journal sheet

---

## Cross-cutting verification

### Navigation philosophy (design intent)

- [ ] Home → attention today
- [ ] Organizations browser → pick a company
- [ ] Projects browser → pick an engagement
- [ ] Network browser → pick a person
- [ ] Detail pages → full dossier for that lens

### Data rules (hierarchy)

- [ ] Org timeline excludes person-only evidence (roster only on sidebar)
- [ ] Project timeline includes contact-linked evidence within project dates
- [ ] Person evidence is direct links only
- [ ] Relationship strength / org status derived from evidence, not manual CRM fields

### AI Charter alignment

- [ ] No fabricated counts or history in UI labels
- [ ] Metrics prioritize attention; people not “scored” as good/bad
- [ ] Reports and summaries traceable to evidence (when AI features added)

---

## Known gaps & placeholders (v1.0)

Track separately — do not check as complete until fixed:

| Item | Status |
|------|--------|
| Global search (⌘K) | Wired to `/argus/search`; overlay palette deferred |
| PIN button in top bar | Wired when `ARGUS_PRIVATE_PIN` set |
| Notifications bell | Live inbox count |
| Browser **Filters** buttons (org/project/network) | Org/project status filter wired; network uses tabs |
| Inbox unlink / replace link persistence | **Fixed** — `setInboxLinkedEntities` |
| Follow Ups / Reminders sidebar routes | Follow Ups → `#follow-ups`; Reminders → legacy journal |
| Person detail page v2 shell | Uses legacy `/argus/network/[id]` |
| Production `/argus/journal` not replaced | By design until feature parity |

---

## Version history

| Version | Date | Scope |
|---------|------|--------|
| **1.0** | 2026-07-06 | Initial checklist: global shell, Home, org/project/network browsers, inbox v2, org/project detail, topics/events browse |
| **1.1** | 2026-07-06 | second-origin checkpoint; solutions map; inbox unlink, search, PIN, filters |

---

## Sign-off

**Design version verified:**

| Role | Name | Date | Version |
|------|------|------|---------|
| User | | | 1.0 |
| Builder | | | 1.0 |

**Notes:**

```text
(add exceptions, blocked items, or environment tested: local / production)
```

---

## Adding a new section (template)

When you add a new screen, copy this block into the checklist and bump the design version if layout changes:

```markdown
## [Screen name] (`/argus/v2/...`)

**Files:**  
**Purpose:**

### [Component group]

- [ ] Visual matches mockup
- [ ] Live data (not mock)
- [ ] Navigation / links correct
- [ ] Empty states
- [ ] Mobile / desktop layout
- [ ] Error / not-found state
```
