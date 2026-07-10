# ARGUS Deliver — Repositioning Plan

**Status:** Shipped (070905) — phases D0–D5  
**Trigger:** Quick Package HTML deploys correctly but feels like an activity index, not a defensible dossier.  
**Related:** [`deliver-formats-plan.md`](deliver-formats-plan.md) · [`evidence-organization-vision.md`](evidence-organization-vision.md)

---

## Export branding (testing phase)

| Rule | Implementation |
|------|----------------|
| No product name in HTML/MD exports | Generic "Evidence Report" title; no ARGUS references |
| Footer | `Delivered by {ARGUS_DELIVER_PREPARER}` — default `devinit` |
| Internal links removed | Activity summary index uses Detail column, not `/argus/...` hrefs |
| Watermark | **Off** during testing (`shouldShowDeliverWatermark()` returns false) |

### Future checklist (not implemented)

- [ ] Free tier: watermark on exported reports
- [ ] Premium tier: user can disable watermark for client delivery
- [ ] Per-user preparer name from account profile (when multi-user exists)
- [ ] Optional cover note field on Deliver (user-written, not AI)

Env: `ARGUS_DELIVER_PREPARER`, `ARGUS_DELIVER_WATERMARK=1` to force watermark in dev.

---

## What Quick Package HTML is today (honest)

It is **not** a handover dossier. It is a **scoped activity report**:

| Section | What it shows | What it does NOT show |
|---------|---------------|------------------------|
| Hero + stats | Counts (evidence, emails, journal, files) | Meaning, outcome, decisions |
| Timeline | Title, date, kind, short body if log has text | Full email bodies, attachments inline, thread context |
| Evidence index | Date, kind, title, internal `href` | Readable content, PDF text, images |
| Files | Filename, mime, source path | File bytes, previews |
| Linked entities | Names list | Relationship narrative |

**Why it feels empty:** ARGUS stores evidence as **references** (log line + link to email/file). The HTML renderer lists **metadata**, not **artifacts**. One-line registrations ("Discussion completed — see attached report") look correct in the system but produce thin HTML.

**Conclusion:** Current output is valid for *"what happened, when, in what order"* — not for *"here is everything to defend a position."*

---

## Two products, not one

Split Deliver into two explicit intents:

### 1. Activity Summary (rename Quick Package)

**User question:** *"What happened on this topic/event/project?"*

| Attribute | Value |
|-----------|--------|
| **Rename (UI)** | Activity Summary · Scope Snapshot · Evidence Index |
| **Format** | HTML (default), MD (draft) |
| **Content** | Chronology, counts, titles, one-line notes, entity list |
| **Recipient** | Self, manager skim, "what do you want to see?" |
| **Analogy** | GitHub activity feed export, Jira sprint summary, case chronology index |

**Copy pattern:**

> *"This is what was recorded. Open ARGUS or the Vault for full artifacts."*

Rename in UI: **Quick package** → **Activity summary** (keep API path `/deliver/quick` internally).

### 2. Evidence Dossier (new — the real Deliver)

**User question:** *"Give me the full story with proof — emails, files, timeline, people — organized for someone else."*

| Attribute | Value |
|-----------|--------|
| **Name** | Evidence Dossier · Full Package · Handover Bundle |
| **Format** | HTML reader + ZIP attachments (or share link) |
| **Content** | Everything in scope, inlined or bundled |

**Minimum dossier sections:**

1. **Cover** — scope, date range, purpose, preparer  
2. **Executive chronology** — narrative thread (auto-assembled from dated evidence, not AI fiction)  
3. **Evidence by type** — emails (full body or excerpt), registrations (full text), files (embedded or appendix)  
4. **People & context** — who appears, orgs, projects, topics  
5. **Event anchors** — if scope is topic/project, sub-sections per linked event  
6. **Appendix** — file manifest, hashes (Vault), private redaction notice  

**No escape:** Dossier requires **inlining or bundling** content. Metadata-only export is explicitly the *other* product.

---

## Format ladder (revised)

```text
Activity Summary     → HTML/MD     → index & chronology (today's Quick Package)
Evidence Dossier     → HTML+ZIP    → full handover (build on Vault collector)
Share link           → viewer      → Dossier read-only, expiring (InterACT pattern)
Forensic Vault       → ZIP+manifest → integrity, migration, legal hold
```

PDF = print from Dossier HTML, not a separate product.

---

## Who to copy (patterns, not products)

| Source | Copy what | For ARGUS |
|--------|-----------|-----------|
| **Litigation / eDiscovery (Relativity, Everlaw)** | Chronological + custodian + Bates-style index; production = documents + load file | Dossier structure; manifest in ZIP |
| **Case management (Clio, legal hold tools)** | Matter timeline + parties + document list → export packet | Event anchor + linked evidence sections |
| **Investigation handover (internal audit)** | Index first, full docs in appendix, cover memo | Activity Summary vs Dossier split |
| **GitHub / Linear / Jira** | Activity feed vs full export | Activity Summary naming |
| **Notion / Confluence export** | Page + attachments zip | HTML reader + bundled files |
| **InterACT (SLB)** | Notify + portal viewer + controlled access | Share link phase |
| **Apple Health / bank statements** | Summary page + drill-down | Activity Summary; Dossier = drill-down included |

**Do NOT copy:** Word authoring, slide decks, BI dashboards. ARGUS delivers **evidence packages**, not presentations.

**Best composite model:**

> **Relativity's production index** (structure)  
> + **Confluence space export** (HTML + attachments)  
> + **InterACT delivery** (share link governance)

---

## Implementation phases (shipped 070905)

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **D0** | Rename UI: Quick package → Activity summary; honest preview copy | ✅ |
| **D1** | Activity summary: email/log snippets, drop internal href column | ✅ |
| **D2** | Evidence Dossier v1: HTML with full email body + journal text | ✅ |
| **D3** | Dossier ZIP: report.html + files/ + manifest.json | ✅ |
| **D4** | Narrative thread: sections grouped by Event anchor | ✅ |
| **D5** | Share link viewer `/deliver/s/{token}` (30-day TTL) | ✅ |

API: `/api/argus/deliver/quick` (activity), `/api/argus/deliver/dossier`, `/api/argus/deliver/share`

---

## Narrative / "stories" without inventing truth

Dossier narrative = **assembly**, not authoring:

```text
Event: Rig Move (2024-03-12)
  ├─ Email: Handover approval (excerpt)
  ├─ Register: "Meeting completed — see report"
  └─ File: handover_checklist.pdf

Topic: RSS Optimization
  ├─ Register: "Discussion with Kyle..."
  └─ Email: ...
```

Rules (AI charter aligned):

- Only text from stored evidence  
- Section headers from Event/Topic entity names  
- No synthesized conclusions in v1  
- Optional v2: user-written "cover note" field on Deliver (one paragraph, stored, not AI)

---

## Decision summary

| Question | Answer |
|----------|--------|
| Is today's HTML wrong? | No — mislabeled. It's an **Activity Summary**. |
| Rename? | Yes — set expectations. |
| Need full detail? | Yes — separate **Evidence Dossier** on Vault path. |
| Can HTML alone suffice for dossier? | Only if bodies and files are **inlined or linked with content**; else ZIP required. |
| Who to copy? | eDiscovery index + Confluence export + InterACT share |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-09 | Initial repositioning plan — Activity Summary vs Evidence Dossier |
| 2026-07-09 | **070905** — D0–D5 shipped; generic branding; share links; watermark checklist |
