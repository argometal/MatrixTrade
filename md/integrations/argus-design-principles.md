# ARGUS — Design Principles

**Status:** Canonical — architecture constitution  
**Implementation:** Active — v2 UX and export layers must conform to these principles.

**Index:** [`md/argus/README.md`](../argus/README.md) · **AI rule:** [`ai-charter.md`](../argus/ai-charter.md)

Read with [`argus-architecture.md`](argus-architecture.md).

ARGUS is a professional memory system, not a database editor. These principles govern every future feature, UI change, and integration.

---

## 1. Capture before classify

Information enters ARGUS unclassified. Structure is applied later — or never.

Inbox, quick journal capture, and external ingest (API, email) must not require the user to choose type, entity, or category before content exists.

---

## 2. Journal is immutable history

Journal entries record facts as they were captured. Corrections append; they do not erase.

The Journal is the single source of truth. Network, Search, and AI read from it. They do not replace it.

---

## 3. Network never owns data

Network is a derived view of relationships and context from Journal history.

No fact lives only in Network. No relationship state is stored independently of Journal entries.

---

## 4. Raw evidence is never modified

Inbox raw content (`rawText`, `rawEmail`, original attachments) is preserved unchanged.

Conversion to Journal may add interpretation alongside evidence; it must not overwrite or replace the original capture.

---

## 5. Relationships emerge from facts

ARGUS manages **relationships**, not just entity records.

A relationship is the pattern of interactions, shared context, and topics that appear across Journal entries — not a row in a contact list.

---

## 6. AI annotates, never rewrites

AI may summarize, tag, suggest entities, or surface patterns as **annotations** linked to Journal or Inbox items.

AI must not replace `body`, `rawEmail`, or user-authored content. Annotations are overlays, not canonical history.

See also: [`md/argus/ai-charter.md`](../argus/ai-charter.md) — evidence-backed reports, neutrality, no fabrication.

---

## 7. Search spans every module

Search is cross-cutting retrieval across Inbox, Journal, Entities, Attachments, and (future) annotations.

Search is not a pipeline stage and does not own data.

---

## 8. Privacy is invisible by default

Private entries are hidden unless explicitly unlocked. Privacy controls must not add friction to normal capture.

The default experience assumes public-to-self journal use; private is opt-in per entry.

---

## 9. Reduce cognitive load whenever possible

Every decision at capture time is a tax on memory.

Prefer inference, defaults, and deferred classification over forms, wizards, and type pickers.

---

## 10. If a feature requires multiple new decisions, reconsider it

A feature that asks the user to choose type, entity, date, topic, and attachment before writing fails the capture-first test.

Pause and redesign the feature — or reject it.

---

## Gate

**Do not continue implementing UX** until:

- [`argus-architecture.md`](argus-architecture.md) reflects accepted decisions
- [`md/argus/ai-charter.md`](../argus/ai-charter.md) is understood by anyone using AI on ARGUS
- This document is referenced from [`CHATGPT.md`](../../CHATGPT.md)

New work (email ingestion, persistent storage, AI) builds on these principles — not around them.
