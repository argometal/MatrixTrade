# ARGUS design matrix — locked stage (Jul 2026)

**Status:** Locked for implementation. Current production UI unchanged; new shells live under `/argus/v2/*`.

**Product identity:** [`evidence-organization-vision.md`](evidence-organization-vision.md) — entities are **context lenses** on one evidence graph; Event is the **case anchor**.

**Index:** [`README.md`](README.md) · **QA checklist:** [`v2-design-checklist.md`](v2-design-checklist.md) · **Update rule:** [`checklist-protocol.md`](checklist-protocol.md)

**AI rule of construction:** [`ai-charter.md`](ai-charter.md) — metrics prioritize attention; people are never reduced to scores.

## Three lenses + anchor (one evidence graph)

| Role | Entity | Time | Question | Evidence scope |
|------|--------|------|----------|----------------|
| **Institutional context** | Organization | Forever | What happened with this company? | Direct org links; people as roster, not proxy |
| **Business context** | Project | Start → end | What did we deliver in this engagement? | Direct + via project contacts within dates |
| **Relationship context** | Person | Relationship lifetime | What is the evidence trail for this relationship? | Direct person links; HR/liability via protected entries |
| **Knowledge binder** | Topic | Years | Everything on this subject across time | Direct links + correlated evidence stream |
| **Case anchor** | Event | Occurrence | What happened here; what evidence belongs? | Emails, files, notes hung from the event |

## Journal — evidence registration

Journal is **not** long-form authoring. It is **register evidence** — often one sentence plus a link to the real artifact (report, email, file).

| Type | Meaning | Storage (today) |
|------|---------|-----------------|
| **Note** | One-time evidence registration | `kind: event` |
| **Log** | Recurring / continue thread | `kind: log` |

Applies on org, project, and person pages. Migration adds “Continue log” UX without schema change first.

## UI mockups mapped

| Image | Route (v2 preview) | Purpose |
|-------|-------------------|---------|
| Home dashboard | `/argus/v2` | Overview stats, activity, follow-ups, timeline, entities, tags |
| Organization (Petronas) | `/argus/v2/organizations/demo` | All-time chronological viewer + relationship panel |
| Project (Well A) | `/argus/v2/projects/demo` | Bounded timeline, metrics, results |

## Migration rule

Do **not** remove or replace `(app)` routes (`/argus/journal`, `/argus/network`, etc.) until features are ported one by one into v2.

## Production entry points

- Home: `/argus/v2` (v2) · `/argus/journal` (legacy)
- Network browse: `/argus/v2/browse/network`
- Person detail: `/argus/v2/network/[id]`
- Organizations: `/argus/v2/organizations/[id]`
- Projects: `/argus/v2/projects/[id]`
- Inbox: `/argus/v2/inbox`
