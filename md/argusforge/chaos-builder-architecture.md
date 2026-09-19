# Chaos builder architecture — CHANGE 24-1C

**Status:** **Approved for implementation** — architecture + active foundation (PR #76)  
**Date:** 2026-07-25 · CHANGE **24-1C**  
**Discussion base:** [`chaos-locus-capture-design.md`](chaos-locus-capture-design.md)  
**Change note:** [`change-24-1c.md`](change-24-1c.md)

---

## 1. Final architecture decision

ArgusForge is the **new system under construction**.  
Historical Alexandria remains a **controlled legacy validation runtime** during reconstruction.

```text
Chaos / ArgusForge
  → neutral exchange package (argusforge.exchange)
  → isolated Alexandria Legacy Adapter
  → historical Alexandria execution
  → result package
  → evidence → ArgusForge
```

| Boundary | Rule |
|----------|------|
| AF core model | Owned by AF — own types, own persistence |
| Historical Alexandria classes / DB schema | **Not** imported into AF core |
| Direct writes into Alexandria storage | **Forbidden** |
| Alexandria Legacy as AF source of truth | **No** |
| Inspection / execution / isolated adapter | **Allowed** (freeze ≠ forbid testing) |
| Final Alexandria motor architecture | **Deferred** until audit + validation |
| Exact compatibility schema | **Pending audit** |
| AF development | **Proceeds without waiting** for full audit |

Completed AF capabilities should later be tested through the thin Legacy Adapter.

---

## 2. Provisional ownership

| Surface | Owns |
|---------|------|
| **Chaos** | Progressive capture & construction; Decks; Fragments; text/image blocks; ordering; stable IDs; optional structural hints; local asset persistence; neutral export preparation |
| **Argus** | Organization; evidence; explicit relations; recurrence; affinity suggestions; Realm visualization; Active / Focus / Archive; interpretation of test results |
| **Alexandria Legacy** | Temporary execution of historical spatial / Library Build / Viewer / Parcour review / Castle calc / Godot / Gatekeeper behaviors |
| **Alexandria Future** | Reconstructed spatial & learning motor after audit |

**Not exclusive yet (exchange-domain):** Realm · Parcour · Castle · Locus — may be produced, interpreted, or executed by different stages. Do **not** declare Argus (or Chaos) exclusive owner until audit completes.

---

## 3. Terminology (UI)

| Name | Meaning |
|------|---------|
| **Realm** | Practical browse location in AF UI — not intellectual meaning |
| **Chaos Deck** | Container of multiple Fragments — **convenience only**; no implied topic, order, study unit, or Parcour |
| **Fragment** | Raw capture / idea — may be incomplete, disordered, temporary, or useless |
| **Block** | Optional internal structure when a Fragment evolves — does **not** require Alexandria |
| **Asset** | Binary resource referenced by a block |

**Sealed (CHANGE 24-50):** Chaos may contain without understanding. Do **not** equate Deck↔Parcour or Fragment↔Locus. Do **not** call every block a Locus. A future Locus may reference one or more blocks; B0 does not force that.

---

## 4. Long arc

```text
NOW                         NEXT                         LATER
─────────────────────────   ──────────────────────────   ─────────────────────────
1 Chaos builder (24-1C)     Alexandria Legacy bridge     Alexandria Future motor
2 Home Explorer (24-1E)     Real usage / evidence        Argus refinement (paused)
  IndexedDB + export        (Argus preserved experimental — not current priority)
  Legacy Adapter boundary
```

**Neutral exchange** is an **approved requirement** (B0 foundation).  
**Full Legacy translation** and **final motor** wait on audit — not a reason to block Chaos builder.

Research notes on historical Library formats remain useful; they are **not** “pipeline cancelled.”

---

## 5. B0 scope (this change)

### In scope

1. Ordered blocks on a Fragment inside a Chaos Deck.  
2. Create/edit **text** block.  
3. Add **image** block; binary in **IndexedDB**; survive refresh.  
4. Stable IDs for deck, Fragment, block, asset.  
5. Neutral JSON export (`argusforge.exchange` v1) — assets referenced, binaries not embedded (ZIP deferred).  
6. Existing AF03 data + Vault prep remain compatible.  
7. Legacy Adapter **interface only** (`pending_audit`).  
8. Result package **types/docs** only.

### Out of scope (B0)

Complete adapter · Alexandria write access · Godot · Parcour/Castle engines · scheduler/SRS · layout redesign of Home/Argus/Vault · ZIP packaging · rich slash menu · spatial canvas · final Locus authoring · exclusive Realm/Parcour/Castle/Locus ownership.

---

## 6. Data model (B0)

Repo version **3** extends AF03 without wiping v2:

- **Fragment** = existing content item + builder migration flag + optional hints/tags.  
- **Block** = `{ id, fragmentId, type: text|image, order, payload, createdAt, updatedAt }`.  
- **Asset meta** in repo; **bytes** in IndexedDB `argusforge-chaos-assets-v1`.  
- Optional `structuralHints` (candidateRealmId, …) — unused in B0 UI.

Migration: legacy items projected once into blocks (`builderMigrated`); idempotent; no destructive rewrite of `body`.

---

## 7. Storage

| Layer | Store |
|-------|--------|
| Metadata (decks, fragments, blocks, asset meta) | localStorage AF03 key — versioned migrate, **never** auto-clear / reseed over user data |
| Image binaries | IndexedDB — refs only in repo; **no** base64 in localStorage |
| IDB failure | Surface error; **keep** text content |

---

## 8. Export + adapter + results

- Export: downloadable JSON — see implementation `af03-exchange-export.ts`.  
- Adapter: [`legacy-alexandria-adapter-boundary.md`](legacy-alexandria-adapter-boundary.md).  
- Results: neutral result contract types for later Argus evidence — no import UI in B0.  
- Audit: [`alexandria-legacy-audit-checklist.md`](alexandria-legacy-audit-checklist.md).

---

## 9. Build sequence

| Step | Status |
|------|--------|
| **B0** | **Implementing in 24-1C** — vertical slice |
| B1+ | ZIP/binary bundle, dump paste triad polish, progressive tiers, richer blocks — later |
| Legacy Adapter translate | After audit |
| Alexandria Future motor | After audit + validation |

---

## Related

| Doc | Role |
|-----|------|
| [`change-24-1c.md`](change-24-1c.md) | Change record |
| [`chaos-locus-capture-design.md`](chaos-locus-capture-design.md) | Earlier product discussion |
| [`legacy-alexandria-adapter-boundary.md`](legacy-alexandria-adapter-boundary.md) | Adapter boundary |
| [`alexandria-legacy-audit-checklist.md`](alexandria-legacy-audit-checklist.md) | Audit track |
| [`alexandria-frozen-contract.md`](alexandria-frozen-contract.md) | Repo freeze + evolution |
| [`chaos-to-library-alexandria-pipeline.md`](chaos-to-library-alexandria-pipeline.md) | Historical research (not cancelled; adapter pending audit) |
