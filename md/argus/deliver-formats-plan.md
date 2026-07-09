# ARGUS Deliver — Output Formats Plan

**Status:** Canonical (planning) — HTML v1 implemented; MD draft; PDF and share-link proposed  
**Related:** [`evidence-organization-vision.md`](evidence-organization-vision.md) · [`export-delivery-handoff.md`](export-delivery-handoff.md)

---

## Principle

One **collector** (`collectVaultEvidence` + `buildEntityEvidenceStream`). Multiple **views** for different recipients and risk profiles.

```text
Evidence (collector)
  → Markdown   (draft / dev / copy-paste)
  → HTML       (handover presentable)     ← default Quick Package
  → PDF        (formal attachment)        ← proposed: print HTML
  → Share link (viewer-only, InterACT-lite) ← proposed
  → ZIP+manifest (forensic / portability)  ← Evidence Vault
```

**JSON = truth. ZIP = forensic delivery. HTML = human view. PDF = external polish.**

---

## Format ladder (least → most)

| Step | Format | Status | Use case |
|------|--------|--------|----------|
| 1 | **Markdown** | Implemented | Internal draft, git-friendly, API `format=md` |
| 2 | **HTML** | **Implemented** | Handover to manager/client; opens in any browser; print→PDF |
| 3 | **PDF** | Proposed | Email attachment; “official” doc — generate via browser print or server render from HTML |
| 4 | **Share link** | Proposed | InterACT pattern: notify + read-only viewer + expiry + audit |
| 5 | **ZIP Vault** | Implemented | Forensic integrity, migration, full file bundle |

---

## Quick Package (implemented)

| Piece | Location |
|-------|----------|
| Collector | `lib/argus/export/collect-evidence.ts` |
| Markdown | `lib/argus/export/packages/quick-package.ts` |
| HTML | `lib/argus/export/packages/quick-package-html.ts` |
| API | `GET/POST /api/argus/deliver/quick` — JSON `{ html, markdown, summary }`; download `?download=1` (HTML default), `?format=md` |
| UI | `V2QuickDeliverModal`, `V2DeliverShell` |

HTML includes: scope header, stats, timeline, evidence index, file metadata, linked entities. Self-contained CSS; `@media print` for PDF via browser.

---

## PDF (next, low effort)

**Recommendation:** Do not add server PDF deps initially.

1. User downloads HTML
2. Browser Print → Save as PDF

Optional later: Puppeteer/`@react-pdf` rendering same HTML template server-side for one-click PDF in Deliver center.

---

## Share link (InterACT-lite, future)

Pattern learned from SLB InterACT: **email notifies, portal delivers, viewer controls access.**

Proposed ARGUS flow:

```text
Deliver → Share read-only link
  → signed token (TTL, optional email allowlist)
  → /argus/share/[token]
  → chronology + evidence index + file preview
  → no download (or audited download)
  → revoke + access log
```

Not required for handover v1; aligns with forensic + client delivery pain.

---

## Package catalog alignment

| Package | Primary format | Secondary |
|---------|----------------|-----------|
| Quick Package | HTML | MD, ZIP |
| Knowledge Package | HTML + ZIP | — |
| Incident Package | ZIP + HTML chronology | — |
| Evidence Vault | ZIP + manifest | — |
| Recognition / Relationship | HTML report | PDF |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-09 | Initial plan — HTML as default Quick Package output |
