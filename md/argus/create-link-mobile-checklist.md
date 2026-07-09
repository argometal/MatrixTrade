# ARGUS — Create & Link Mobile Wizard Checklist

**Design version:** 1.0 (Change 139)  
**Recovery tag:** `source-3` (before mobile wizard)  
**Component:** `app/argus/components/ArgusCreateLinkMobile.tsx`  
**Desktop counterpart:** `ArgusCreateLinkWindow.tsx` (`lg+` only)  
**Breakpoint:** below `1024px` (`lg`)

**Correlation guide:** [`correlation-guide.md`](correlation-guide.md)

---

## Web vs mobile comparison

| Aspect | Desktop (`lg+`) | Mobile (`< lg`) |
|--------|-----------------|-----------------|
| Layout | 4 columns visible at once | Full-screen step wizard |
| Choose type | Left rail | Step 2 — full-screen list |
| Fill details | Center column | Step 3 — progress `1` |
| Add links | Right-center column | Step 4 — progress `2` |
| Create missing | Bottom strip | Step 5 — progress `3` |
| Review | Right column + footer | Steps 6–7 — progress `4` |
| Save feedback | Inline / redirect | Step 8 processing → Step 9 success |
| Post-save | Auto-navigate | View Item / Go to Home |

---

## Mockup step map

| # | Mockup screen | Mobile step | Verified |
|---|---------------|-------------|----------|
| 1 | Start creation (Home +) | Opens from `ArgusAddProvider` | [ ] |
| 2 | Choose what to create | `choose-type` | [ ] |
| 3 | Fill details | `details` + progress bar `1` | [ ] |
| 4 | Add context (link) | `link` + progress bar `2` | [ ] |
| 5 | Create missing in context | `missing` + progress bar `3` | [ ] |
| 6 | Review links | `review-links` + progress bar `4` | [ ] |
| 7 | Review item | `review-item` | [ ] |
| 8 | Save & link (processing) | `processing` + checklist animation | [ ] |
| 9 | Success | `success` — View Item / Go Home | [ ] |
| 10 | View anywhere | Navigate to saved item / project journal tab | [ ] |

---

## Step 2 — Choose type

- [ ] Full-screen overlay with ✕ close
- [ ] All 7 types listed with icon + hint
- [ ] Journal Note label (not “Journal Entry”)
- [ ] Tap type → advances to details

---

## Step 3 — Fill details

- [ ] Progress indicator shows step **1** active
- [ ] Journal: template, title, content toolbar, date, tags
- [ ] Other types: name + notes
- [ ] **Next** disabled until required field filled (body for journal, name for entities)
- [ ] **Back** returns to choose-type (or closes if `lockItemKind`)

---

## Step 4 — Add context

- [ ] Progress step **2** active
- [ ] Search + filter tabs (Person, Org, Project, Event, Topic, Doc)
- [ ] **Linked (N)** section with color badges + remove ✕
- [ ] **Add more links** — recent list when search empty
- [ ] **+** adds to linked set
- [ ] **Next** → missing (if tag topics not found) or review-links

---

## Step 5 — Create missing

- [ ] Progress step **3** active
- [ ] Tag-based “Topic not found” cards with **Create & Link Topic** (amber CTA)
- [ ] Category field on topic cards
- [ ] **Next** → review-links

---

## Step 6 — Review links

- [ ] Progress step **4** active
- [ ] Count grid: Person, Org, Project, Event, Topic, Doc
- [ ] Full linked list with remove
- [ ] **Edit Links** → back to link step
- [ ] **Continue** → review-item

---

## Step 7 — Review item

- [ ] Read-only preview: title, body, tags, date
- [ ] **Save & Link ✓** (purple/violet primary on mobile mockup — green on desktop)
- [ ] **Back** → review-links

---

## Step 8 — Processing

- [ ] Spinner / progress ring
- [ ] Checklist: creating note, linking N items, creating topics, building connections
- [ ] Transitions to success on save complete

---

## Step 9 — Success

- [ ] Green checkmark + “All done!”
- [ ] **View Item** → saved entry/entity page
- [ ] **Go to Home** → `/argus/v2`

---

## Link-only mode (`mode: "link"`)

- [ ] Skips choose-type and details
- [ ] Starts at link step
- [ ] Save label “Save & Link”

---

## Correlation rules (must hold)

- [ ] Journal links persist to `linkedEntityIds` + `linkedLogIds` on save
- [ ] Created missing topics auto-added to link set
- [ ] Saved journal appears on linked Project/Person org views (after refresh)
- [ ] No second dialog for linking after save

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-06 | Change 139 — mobile wizard; `source-3` recovery tag |
