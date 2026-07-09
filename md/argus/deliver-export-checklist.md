# Deliver / Export Center — QA Checklist

**Route:** `/argus/v2/deliver`  
**API:** `GET /api/argus/export/preview` · `POST /api/argus/export`  
**Status:** v1 — Evidence Vault only (other packages UI-only)  
**Update rule:** Check boxes when verified; note environment (local LAN / phone / Vercel).

---

## Navigation & shell

- [ ] Sidebar shows **Deliver / Export** with NEW badge
- [ ] Route loads inside v2 layout (sidebar + top bar)
- [ ] Page title: Deliver / Export Center (BETA)
- [ ] Value props visible (evidence-based, traceable, private by default)
- [ ] Export History button present (disabled / coming soon)

## Package type cards

- [ ] All 5 cards render (Recognition, Incident, Knowledge, Relationship, Evidence Vault)
- [ ] Evidence Vault selectable and marked available
- [ ] Other four show "Coming soon" and cannot generate
- [ ] Selecting unavailable package disables Generate (or shows message)

## Define scope

- [ ] Scope tabs: Person, Project, Organization, Topic, Event
- [ ] Entity dropdown populates per scope type (live data)
- [ ] Entity search filter works client-side
- [ ] Start / end date inputs affect preview counts
- [ ] Include: Journal/Logs checkbox toggles log count
- [ ] Include: Inbox/Emails checkbox toggles inbox count
- [ ] Include: Attachments checkbox toggles file count
- [ ] Private toggle disabled when PIN not configured
- [ ] Private toggle ON without unlock shows warning (top bar PIN)

## Package summary (live preview)

- [ ] Summary updates when scope / dates / includes change (~300ms debounce)
- [ ] Evidence items count matches logs + inbox in scope
- [ ] Files count updates with attachments toggle
- [ ] Date range label: "All dates" or custom range
- [ ] Refresh button re-fetches preview
- [ ] Error shown when invalid scope id

## Generate package (Evidence Vault)

- [ ] Generate downloads ZIP file
- [ ] ZIP contains `manifest.json`, `evidence.json`, `timeline.json`
- [ ] ZIP contains `files/{id}` when attachments included
- [ ] `manifest.json` has: version, exportedAt, packageType, scopeType, scopeId, scopeName, includePrivate, containsPrivate, evidenceCount, fileCount, hashes, sourceIds, dateFrom, dateTo, includes
- [ ] Inbox + converted log cross-referenced (not double-counted as two emails in timeline emailCount)
- [ ] Date filter excludes out-of-range logs and inbox
- [ ] Unchecking attachments omits `files/` from ZIP
- [ ] Private export without PIN unlock returns 403
- [ ] Private export with unlock includes private records when toggled

## Scope lens rules (evidence correctness)

- [ ] **Person:** direct links only
- [ ] **Organization:** direct links only
- [ ] **Project:** direct + via linked contacts, date-bounded
- [ ] **Topic / Event:** direct links on entity id

## Deep links

- [ ] Person profile **Export** button opens `/argus/v2/deliver?scopeType=person&scopeId=…` with entity pre-selected
- [ ] URL params `scopeType` + `scopeId` prefill form

## Mobile (local dev, no Vercel required)

- [ ] Open `http://<lan-ip>:3002/argus/v2/deliver` on phone (same Wi‑Fi)
- [ ] Package cards scroll / stack on narrow viewport
- [ ] Entity select usable on mobile
- [ ] Generate triggers download (or files app on iOS — note behavior)
- [ ] PIN unlock via top bar works on phone

## Production (after Vercel push)

- [ ] `/argus/v2/deliver` loads on matrix-trade-theta.vercel.app
- [ ] Export uses production Supabase / data store
- [ ] Large ZIP completes within serverless timeout (note if fails — async export deferred)

## Known gaps (defer)

- [ ] Export History persistence
- [ ] Recognition / Incident / Knowledge / Relationship package generation
- [ ] Preview modal (eye icon) — refresh only for now
- [ ] Accurate byte size (currently estimated)
- [ ] Async export for very large archives

---

*Checklist v1.0 — 2026-07-07*
