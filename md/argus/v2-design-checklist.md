# ARGUS v2 Design Checklist

**Design version:** 1.2  
**Last updated:** 2026-07-06 (builder audit — working vs user QA)  
**Checkpoint branch:** `second-origin`  
**Solutions map:** [`v2-checklist-solutions.md`](v2-checklist-solutions.md)  
**Preview entry:** `/argus/v2`  
**Production UI (unchanged):** `/argus/journal`, `/argus/network`, etc.

**Protocol (mandatory updates):** [`checklist-protocol.md`](checklist-protocol.md) — update this file on every v2 UI change.

---

## Review status snapshot (2026-07-06)

**Legend:** **Working** = implemented in code and `npm run build` passes. **User reviewed** = you verified in local or production QA.

| Area | Working | User reviewed | Notes |
|------|---------|---------------|-------|
| Global shell | Yes | No | Layout, nav, top bar wired |
| Create & Link desktop (138) | Yes | No | 4-column `ArgusCreateLinkWindow` |
| Create & Link mobile (139) | Yes | No | Step wizard below `lg` |
| Inbox v2 list + link modal | Yes | No | Tabs, select, `+ Link` modal |
| Inbox → Create/Link evidence (140) | Yes | No | PR #8; not deployed to prod until merge |
| Home preview | Yes | No | Live counts from `readArgus` |
| Org / Project / Network browsers | Yes | No | Grid/list + metrics |
| Org / Project detail | Partial | No | v2 shells; some legacy links |
| Topics / Events browse | Yes | No | Master-detail |
| Cross-cutting data rules | Partial | No | Code in `hierarchy.ts`; not QA’d end-to-end |

**User QA session:** not started for v1.2 scope. Use `[c]` items below as the test list.

---

## How to use this checklist

1. **When a new screen or component is designed**, add or update its section here before calling the work done ([`checklist-protocol.md`](checklist-protocol.md)).
2. **You check each box** after verifying on local (`http://localhost:3002`) or production (`https://matrix-trade-theta.vercel.app`).
3. **On any redesign**, bump the design version, reset affected checkboxes, and re-verify everything affected.
4. **Sign-off** at the bottom when a version is accepted.
5. **Builders / AI:** add a row to *Checklist maintenance log* with every change — do not skip.

Mark items:

| Mark | Working | User reviewed |
|------|---------|---------------|
| `[ ]` | No / not verified | No |
| `[c]` | Yes (code + build) | **No** — pending your QA |
| `[x]` | Yes | **Yes** — you confirmed |
| `[~]` | Partial / placeholder | N/A |

**Rule:** builders mark `[c]` after implementation; only **you** upgrade `[c]` → `[x]` after QA.

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
| 2026-07-06 | **Change 138** | Desktop Create & Link 4-column mockup layout |
| 2026-07-06 | **Change 139** | Mobile Create & Link step wizard; `source-3` recovery tag; correlation docs |
| 2026-07-06 | **Change 140** | Inbox email → unified Create/Link flow (`inbox-evidence` mode); email stays in inbox |
| 2026-07-06 | **Checklist v1.2 audit** | Working vs user-reviewed status; `[c]` legend; snapshot table; inbox evidence items marked coded |

*Add a row here whenever v2 UI or checklist changes.*

---

## Global shell (`/argus/v2/*`)

**Route:** all v2 pages · **Files:** `layout.tsx`, `V2Sidebar.tsx`, `V2TopBar.tsx`, `V2MobileNav`

### Layout & navigation

- [c] Left sidebar visible on `lg+`; does not overlap main content
- [c] Content column has correct left padding (`lg:pl-56`, `xl:pl-60`)
- [c] Argus logo + tagline in sidebar footer (“Live data · v2 preview”)
- [c] Link to legacy production UI (`/argus/journal`) in sidebar footer

### Sidebar — Capture

- [c] **Inbox** nav item shows live count
- [c] Inbox nav highlights on `/argus/v2/inbox`

### Sidebar — Browse

- [c] **Organizations** → `/argus/v2/browse/organizations`; active on org browse + org detail
- [c] **Projects** → `/argus/v2/browse/projects`; active on project browse + project detail
- [c] **People** → `/argus/v2/browse/network`
- [c] **Topics** → `/argus/v2/browse/topics`
- [c] **Events** → `/argus/v2/browse/events`
- [c] Counts match live data (orgs, projects, people, topics, events)

### Sidebar — Intelligence

- [c] **Network** → `/argus/v2/browse/network`; active on network browse + person detail (`/argus/network/[id]`)
- [c] Follow Ups / Reminders / Tags nav items present (may still route to legacy)

### Top bar

- [c] Sticky header with blur on scroll
- [c] Search field visible on desktop (placeholder “Search anything…”)
- [c] **+ Create** opens unified create & link flow (`ArgusCreateLinkWindow` via `ArgusAddProvider`)
- [c] Mobile: compact Argus title visible when sidebar hidden

### Top bar — placeholders (expect `[~]`)

- [~] Search navigates to `/argus/search`; ⌘K shortcut (in-app palette deferred)
- [~] PIN uses `PrivateLockMenu` when `ARGUS_PRIVATE_PIN` configured; otherwise disabled hint
- [c] Notification bell shows live inbox count
- [~] Profile avatar is static (“VA”)

### Mobile bottom nav

- [c] Floating dock visible below `lg` breakpoint
- [c] Home, Network, Inbox, Search icons navigate correctly
- [c] Inbox badge shows live pending count

### Auth & data

- [c] `/argus/v2` requires ARGUS session (redirects to login when configured)
- [c] Protected/private records hidden until PIN unlock (when enabled)
- [c] v2 reads live data (`readArgus` + inbox), not mock data

---

---

## Create & Link — Desktop (`lg+`)

**Files:** `ArgusCreateLinkWindow.tsx`, `create-link-shared.tsx`, `create-link-flow-state.ts`  
**Checklist:** [`create-link-mobile-checklist.md`](create-link-mobile-checklist.md) (comparison table) · [`correlation-guide.md`](correlation-guide.md)

### Layout

- [c] 4 columns: Create item | Form | Link | Review & Save
- [c] Step headers 1–4 in header bar
- [c] Linked (N) panel with remove + search/add
- [c] Create missing strip (step 3) with tag topic suggestions
- [c] Info footer: How it works / What you get / Built for you
- [c] Green **Create & Save** in review column + footer

### Correlation

- [c] All 6 entity types linkable from link panel
- [c] Create missing inline without leaving flow
- [c] Save persists journal + links in one action

### Inbox evidence mode (Change 140, desktop)

- [c] Email evidence banner when opened from inbox (`mode: inbox-evidence`)
- [c] **Link only** rail option (no journal / entity required)
- [c] Prefill title + body from email
- [ ] User QA: link-only save keeps email in inbox — **not reviewed**
- [ ] User QA: optional journal + entity links on one save — **not reviewed**

---

## Create & Link — Mobile (`< lg`)

**Files:** `ArgusCreateLinkMobile.tsx`  
**Full checklist:** [`create-link-mobile-checklist.md`](create-link-mobile-checklist.md)  
**Post-QA review:** [`create-link-correlation-review.md`](create-link-correlation-review.md)

- [c] Step wizard: choose → details → link → missing → review-links → review-item → processing → success
- [c] Progress bar 1–4 matches mockup
- [c] View Item / Go Home on success
- [c] Desktop layout hidden on mobile; mobile hidden on desktop

### Inbox evidence mode (Change 140, mobile)

- [c] **Link only** entry on choose-type step
- [c] Email evidence banner on choose-type
- [c] Success returns to inbox when `returnTo` set
- [ ] User QA: full mobile inbox → create/link path — **not reviewed**

---

## Home preview (`/argus/v2`)

**File:** `app/argus/v2/page.tsx`  
**Purpose:** *What requires attention today?*

### Header

- [c] Title “Home” + subtitle “Overview of your knowledge base · live counts”
- [c] **Legacy journal →** link opens `/argus/journal`

### Stat cards (5-up grid)

- [c] **Journal Entries** — live count + “this week” delta; links to `/argus/journal`
- [c] **Emails** — live inbox count + delta; links to `/argus/v2/inbox`
- [c] **People** — live people count; links to `/argus/v2/browse/network`
- [c] **Organizations** — live org count; links to `/argus/v2/browse/organizations`
- [c] **Projects** — live project count; links to `/argus/v2/browse/projects`
- [c] Hover state (violet border) on each card

### Recent Activity panel

- [c] Shows latest journal / email / meeting activity from live data
- [c] Each row links to correct detail (log, inbox, etc.)
- [c] **View all** → `/argus/journal`
- [c] Empty state when no activity

### Follow Ups panel

- [c] Shows pending follow-ups with tone badges (danger / warning / muted)
- [c] Each row links to source entry
- [c] **View all** → `/argus/journal`
- [c] Empty state when none pending

### Recent Entities table

- [c] Tab strip: Organizations · Projects · People · Topics · Events
- [c] Tab switches entity list (URL `?tab=` for org/project/people on home)
- [c] Topics tab navigates to `/argus/v2/browse/topics`
- [c] Events tab navigates to `/argus/v2/browse/events`
- [c] Columns: Name, Type, Role/Links/People, Last Activity
- [c] Active dot on rows with recent activity
- [c] Row links open correct v2 or legacy detail page

### Timeline (right rail / mobile)

- [c] Desktop (`xl+`): vertical timeline rail in right column
- [c] Mobile: full-width timeline card below main grid
- [c] Entries from merged logs + inbox chronology
- [c] Empty state when no entries

### Tags cloud

- [c] Tags from journal entries with counts
- [c] Color chips render correctly
- [c] Empty state when no tags

---

## Organizations browser (`/argus/v2/browse/organizations`)

**Files:** `organization-browse-utils.ts`, `V2OrganizationsBrowserShell.tsx`  
**Purpose:** *Which organization do I want to analyze?*

### Header & controls

- [c] Title + building icon + subtitle
- [c] **+ Organization** opens create modal; navigates to new org detail after save
- [c] Grid / list view toggle works
- [~] Filters button visible (placeholder OK)

### Summary row

- [c] Total Organizations, Active, Inactive, Archived, Total Projects — live counts

### Organization cards (grid)

- [c] Initials avatar, name, status badge (Prospect / Active / Inactive / Archived)
- [c] Description from notes (truncated)
- [c] Six metrics: Projects, People, Journal, Emails, Files, Topics
- [c] Last contact label + relative time
- [c] Relationship age (e.g. `1y 3m`)
- [c] Activity sparkline (`V2RelationshipChart`) — last 12 months
- [c] Card opens `/argus/v2/organizations/[id]`

### List view

- [c] Compact rows with key metrics
- [c] Same navigation as grid

### Right sidebar — “How to read this page”

- [c] Visible on `xl+`
- [c] Explains overview, metrics, last contact, relationship age, trend, actionable selection
- [c] Tip box about filters

### Footer

- [c] “Showing X to Y of Z organizations” text accurate

---

## Projects browser (`/argus/v2/browse/projects`)

**Files:** `project-browse-utils.ts`, `V2ProjectsBrowserShell.tsx`  
**Purpose:** *Which engagement do I want to open?*

### Header & controls

- [c] Title + subtitle
- [c] **+ Project** create flow
- [c] Grid / list toggle
- [~] Filters placeholder

### Summary row

- [c] Total, Active, Planning, On Hold, Completed, Archived

### Project cards

- [c] Status badge + date range
- [c] Description
- [c] Metrics: People, Journal, Emails, Files, Topics
- [c] Last activity block
- [c] Duration progress bar (when start/end dates exist)
- [c] Team avatar preview + overflow count
- [c] Opens `/argus/v2/projects/[id]`

### Footer section

- [c] “Why this view helps” explainer block

---

## Network browser (`/argus/v2/browse/network`)

**Files:** `network-browse-utils.ts`, `V2NetworkBrowserShell.tsx`  
**Purpose:** *Who should I talk to, trust, or involve?*

### Header & controls

- [c] Title + subtitle (“professional network”)
- [c] **+ Person** create flow → `/argus/network/[id]`
- [c] Grid / list toggle
- [~] Filters placeholder

### Status tabs

- [c] All People, Active, Dormant, New, Lost — counts + filter correctly

### Summary row

- [c] Total People, Active (+ %), Organizations, Projects Together, Emails Exchanged, Interactions Logged

### Person cards

- [c] Avatar initials, name, status badge
- [c] Role + organization (when linked)
- [c] Expertise tags from journal topics
- [c] Last interaction + relationship since
- [c] **Strength %** bar — computed from evidence (not manual)
- [c] Footer metrics: Emails, Journal, Events
- [c] Opens `/argus/network/[id]`

### Right sidebar analytics

- [c] Status donut (Active / Dormant / New / Lost)
- [c] Top organizations bar chart
- [c] Average relationship strength
- [c] Recent interactions feed

### Smart filters

- [c] Key influencers, Decision makers, Technical experts, Recent activity, High value network, Dormant
- [c] Each shows people count; clicking filters the grid
- [c] Filters are views only (no new objects created)

### Pagination

- [c] 8 cards per page; page controls when > 8 people

---

## Inbox v2 (`/argus/v2/inbox`)

**Files:** `V2InboxShell.tsx`, `V2InboxDetailPanel.tsx`, `V2InboxEntityLinkModal.tsx`

### List panel

- [c] Three-column layout on desktop; list + detail without sidebar overlap
- [c] Tabs: All, Unread, In Progress, Processed, Archived — counts + filter
- [~] Filter chips row visible (placeholders OK)
- [c] Select mode + bulk actions UI present
- [c] Click row selects email; updates URL `?selected=`

### Detail panel — header

- [c] **Create / Link** opens unified `ArgusCreateLinkWindow` with email preloaded (`mode: inbox-evidence`)
- [c] **+ Link** opens “Link email” modal (not bottom of page)
- [~] Share / ··· menu placeholders OK
- [c] Subject, from, date, status displayed

### Detail panel — linking

- [c] Link modal: tabs All / People / Orgs / Projects / Topics / Events
- [c] Search within modal
- [c] Multi-select entities
- [c] Inline create entity from modal
- [c] Save persists links to server
- [c] Linked entities shown in header area with remove action

### Detail panel — known gaps

- [c] **Unlink / replace all links** persists correctly (`setInboxLinksAction`)
- [~] Tag picker saves tags on email (tags apply on **convert to journal** only — not persisted on inbox row)
- [c] Convert to journal / archive actions wired (`convertInboxAction`, `archiveInboxAction`)

### Inbox → Create/Link evidence flow (Change 140)

- [c] Email prefilled as evidence (subject + body); journal not required first
- [c] **Link only** assigns email to Person / Org / Project / Event / Topic without new journal
- [c] Inline create missing entities links them to the email on save
- [c] Optional journal note/log created with `inboxItemId`; email status stays pending/linked (not converted)
- [c] Save once: email remains in inbox; appears on linked object timelines
- [ ] **User QA** — full inbox evidence workflow on production — **not reviewed**

### Email body

- [c] Text body renders (`view.textBody`)
- [ ] HTML body render (if HTML-only emails) — **not verified**
- [c] Attachments list visible

---

## Organization detail (`/argus/v2/organizations/[id]`)

**Purpose:** *Everything we know about this company across years.*

### Header

- [c] Back link → organizations browser
- [c] Org name, edit link, location/website from notes when present
- [c] Status badge, relationship chart sparkline

### Main column

- [c] Tab strip (Overview / Timeline / … per `V2OrgTabs`)
- [c] Forever timeline — **direct org links only** (not all people activity)
- [c] Timeline entries link to evidence

### Right panel

- [c] Summary stat cards (journal, emails, files, topics, etc.)
- [c] Linked **people roster** (not evidence proxy)
- [c] Linked projects list
- [c] Contact pills / metrics rows
- [c] Legacy network link for full edit view

---

## Project detail (`/argus/v2/projects/[id]`)

**Purpose:** *Everything that happened during that engagement.*

### Header

- [c] Back link → projects browser
- [c] Project name, status badge, date range
- [c] Edit link → legacy `/argus/projects/[id]`

### Main column

- [c] Tabs per `V2ProjectTabs`
- [c] Bounded timeline — direct + via project contacts within dates
- [c] Key metrics row

### Right panel

- [c] Organization link (when linked)
- [c] Team list with roles
- [c] Topics / events counts
- [c] Legacy project link

---

## Topics browser (`/argus/v2/browse/topics`)

- [c] Master-detail layout (list + detail)
- [c] Tabs: All, My topics, Followed
- [c] Tag chips filter row
- [c] Detail shows linked orgs, projects, people counts
- [c] **+ Capture** opens journal sheet scoped to topic
- [c] Links to legacy network for linked people

---

## Events browser (`/argus/v2/browse/events`)

- [c] Master-detail layout
- [c] Tabs: All, Upcoming, Past
- [c] Grouped by date in list
- [c] Detail shows participants, linked entities
- [c] **+ Capture** opens journal sheet

---

## Cross-cutting verification

### Navigation philosophy (design intent)

- [c] Home → attention today
- [c] Organizations browser → pick a company
- [c] Projects browser → pick an engagement
- [c] Network browser → pick a person
- [c] Detail pages → full dossier for that lens

### Data rules (hierarchy)

- [c] Org timeline excludes person-only evidence (roster only on sidebar)
- [c] Project timeline includes contact-linked evidence within project dates
- [c] Person evidence is direct links only
- [c] Relationship strength / org status derived from evidence, not manual CRM fields

### AI Charter alignment

- [c] No fabricated counts or history in UI labels
- [c] Metrics prioritize attention; people not “scored” as good/bad
- [~] Reports and summaries traceable to evidence (when AI features added)

---

## Known gaps & placeholders (v1.2)

Track separately — do not check as complete until fixed:

| Item | Working | User reviewed | Status |
|------|---------|---------------|--------|
| Global search (⌘K) | Partial | No | Wired to `/argus/search`; overlay palette deferred |
| PIN button in top bar | Partial | No | Wired when `ARGUS_PRIVATE_PIN` set |
| Notifications bell | Yes | No | Live inbox count |
| Browser **Filters** buttons (org/project/network) | Partial | No | Org/project status filter wired; network uses tabs |
| Inbox filter chips | Placeholder | No | UI only |
| Inbox tag picker on email row | No | No | Tags apply on convert-to-journal only |
| Inbox HTML-only email body | Unknown | No | Text body verified in code |
| Inbox Create/Link evidence (140) | Yes | **No** | On branch `cursor/inbox-evidence-create-link-e1a0` / PR #8 |
| Follow Ups / Reminders sidebar routes | Partial | No | Follow Ups → `#follow-ups`; Reminders → legacy journal |
| Person detail page v2 shell | Partial | No | Uses legacy `/argus/network/[id]` |
| Production `/argus/journal` not replaced | N/A | N/A | By design until feature parity |

---

## Version history

| Version | Date | Scope |
|---------|------|--------|
| **1.0** | 2026-07-06 | Initial checklist: global shell, Home, org/project/network browsers, inbox v2, org/project detail, topics/events browse |
| **1.1** | 2026-07-06 | second-origin checkpoint; solutions map; inbox unlink, search, PIN, filters |
| **1.2** | 2026-07-06 | Working vs user-reviewed audit; `[c]` coded-not-QA’d; Change 140 inbox evidence items |

---

## Sign-off

**Design version verified:**

| Role | Name | Date | Version |
|------|------|------|---------|
| User | — | — | 1.2 pending |
| Builder | AI audit | 2026-07-06 | 1.2 coded |

**Notes:**

```text
2026-07-06 — Checklist v1.2 builder audit.
- [c] = implemented + npm run build passes; user QA not started.
- [x] = none yet for v1.2 scope.
- Change 140 (inbox Create/Link evidence) on PR #8; merge + deploy before production QA.
- Test environments: local build OK; production inbox requires login (not exercised this session).
- Next: user walks [c] items top-to-bottom; upgrade to [x] when satisfied.
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
