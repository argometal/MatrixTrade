# ARGUS Network Browser

**Status:** Implemented at `/argus/v2/browse/network`  
**AI rule of construction:** [`ai-charter.md`](ai-charter.md) — metrics prioritize attention; people are never reduced to scores.

---

## Purpose

The Network browser is your professional capital.

It answers: **“Who should I talk to, trust, or involve?”**

It is not a CRM. It is a relationship intelligence system.

---

## Person card

Each card should answer in seconds:

- Who is this person?
- Where do they work?
- What do they do?
- How strong is our relationship?
- When did we last interact?
- Why are they important?

---

## Relationship status

Represents the current relationship: **New**, **Active**, **Dormant**, **Lost**.

Derived from evidence and recency — not project status.

---

## Relationship strength

A dynamic indicator built from evidence. Influenced by emails, journal entries, meetings, projects together, and recent interactions. **Not entered manually.**

Implementation: `lib/argus/v2/network-browse-utils.ts` → `computeRelationshipStrength()`.

---

## Expertise

Quick understanding of what this person knows — from journal topics and linked topic entities. Enables search by capability, not only by name.

---

## Organization

Shows where the person currently belongs. The organization remains independent; the person carries their own history if they change companies.

---

## Smart views

Predefined filters (not new objects): key influencers, decision makers, technical experts, recent activity, high-value network, dormant relationships.

---

## Navigation philosophy

| Route | Question |
|-------|----------|
| Home | What requires attention? |
| Organizations | Which company? |
| Projects | Which engagement? |
| Network | Which person? |
| Person detail (`/argus/network/[id]`) | Everything known about this individual |

---

## Code map

| Path | Role |
|------|------|
| `lib/argus/v2/network-browse-utils.ts` | Card data, strength, status, smart views |
| `app/argus/v2/browse/network/` | Browser UI |
| `lib/argus/v2/hierarchy.ts` | Person evidence scope (direct links only) |
| `lib/argus/network-intelligence.ts` | Underlying relationship health signals |
