# ARGUS Network Browser

**Status:** Implemented at `/argus/v2/browse/network`  
**Mechanics:** [`evidence-engine-mechanics.md`](evidence-engine-mechanics.md)  
**AI rule of construction:** [`ai-charter.md`](ai-charter.md) — people are never reduced to scores; prefer status vocabulary over KPIs.

---

## Purpose

The Network browser is your professional capital.

It answers: **“Who should I talk to next — and who has gone quiet?”**

It is not a CRM. It is an evidence-derived relationship retrieval surface (Evidence Engine).

---

## Person card

Each card should answer in seconds:

- Who is this person?
- Where do they work?
- What do they do?
- What is their **Network status** (New / Active / Dormant / Lost / Archived)?
- When did we last interact?
- What evidence volume is linked (emails, topics, events, projects)?

**Retired:** relationship **strength%** bars and average-strength KPIs (Evidence Engine Phase B).

---

## Relationship status (single vocabulary)

Represents the current relationship: **New**, **Active**, **Dormant**, **Lost**, **Archived**.

Derived from evidence dates, follow-ups, contactValue weight, evidence volume, and lifecycle — **not stored**, not project status.

Implementation: `lib/argus/v2/network-browse-utils.ts` → `deriveNetworkStatus()`.

Same vocabulary on person contact Attention and organization overview.

---

## Evidence volume (smart views only)

Smart views may filter on linked evidence density (emails, logs, events, shared projects). That is a **filter aid**, not a user-facing strength score.

---

## Expertise

Quick understanding of what this person knows — from journal topics and linked topic entities. Enables search by capability, not only by name.

---

## Organization

Shows where the person currently belongs. The organization remains independent; the person carries their own history if they change companies.

---

## Smart views

Predefined filters (not new objects): key influencers, decision makers, technical experts, recent activity, high-evidence network, dormant relationships.

---

## Navigation philosophy

| Route | Question |
|-------|----------|
| Home | What requires attention? |
| Organizations | Which company? |
| Projects | Which engagement? |
| Network | Which person? |
| Person detail (`/argus/v2/network/[id]`) | Everything known about this individual |

---

## Code map

| Path | Role |
|------|------|
| `app/argus/v2/browse/network/` | Browser UI |
| `lib/argus/v2/network-browse-utils.ts` | Cards, **status**, evidence volume, smart views |
| `lib/argus/network-intelligence.ts` | Internal intel (dates, follow-ups); not a second status product |
| [`evidence-engine-mechanics.md`](evidence-engine-mechanics.md) | Canonical mechanics |
