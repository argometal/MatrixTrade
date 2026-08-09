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
- What is their **Network status** (Active / Dormant / Archived)?
- Optional **Hot** priority (recent + denser evidence) — filter, not a status
- When did we last interact?
- What evidence volume is linked (emails, topics, events, projects)?

**Retired:** relationship **strength%** bars; separate **New** and **Lost** status chips (merged into Active / Dormant).

---

## Relationship status (auto — not filed by hand)

Represents the current relationship: **Active**, **Dormant**, **Archived**.

| Status | Meaning | Auto rule (summary) |
|--------|---------|---------------------|
| **Active** | Warm — includes former “New” | Interaction ≤ 90d, or health active/cooling, or thin/new contact still in grace |
| **Dormant** | Quiet / neglected — includes former “Lost” | Otherwise (not archived) |
| **Archived** | Hidden on purpose | Lifecycle archived |

Derived from evidence dates, follow-ups, contactValue weight, and lifecycle — **not stored**. Board column pins are optional personal layout only; pills and badges follow derivation.

Implementation: `lib/argus/v2/network-browse-utils.ts` → `deriveNetworkStatus()`.

### Hot (priority filter — Affinity-style)

Not a fourth status. `isHot` when recent contact **and** denser evidence (e.g. ≤30d + volume≥2, or ≤60d + volume≥8). Emulates **Affinity** relationship strength from activity frequency — without a vanity score KPI.

Same vocabulary on person contact Attention and organization overview (orgs use Active / Dormant / Archived).

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

Predefined filters (not new objects): Hot, key influencers, decision makers, technical experts, recent activity, high-evidence network, dormant relationships.

---

## Viewers

Grid · List · Manage — hover titles name each viewer (same pattern as Topics).

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

## Emulate

| App | What we take |
|-----|----------------|
| **Affinity** | Relationship warmth from email/calendar frequency → Hot + Active/Dormant |
| **Dex / Monica** | Last interaction + follow-ups, not manual CRM stages |
| **Not** Salesforce lifecycle | No hand-filing 1000 contacts into stages |
