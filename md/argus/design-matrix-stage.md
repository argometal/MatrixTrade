# ARGUS design matrix — locked stage (Jul 2026)

**Status:** Locked for implementation. Current production UI unchanged; new shells live under `/argus/v2/*`.

**QA checklist:** [`v2-design-checklist.md`](v2-design-checklist.md) · **Update rule:** [`checklist-protocol.md`](checklist-protocol.md)

**AI rule of construction:** [`ai-charter.md`](ai-charter.md) — metrics prioritize attention; people are never reduced to scores.

## Three lenses (one evidence graph)

| Lens | Time | Question | Evidence scope |
|------|------|----------|----------------|
| **Organization** | Forever | What happened with this company? | Direct org links; people as roster, not proxy |
| **Project** | Start → end | What did we deliver in this engagement? | Direct + via project contacts within dates |
| **Person** | Relationship lifetime | Behavior, potential, risk, recognition, performance | Direct person links; HR/liability via protected entries |

## Journal duality

| Type | Meaning | Storage (today) |
|------|---------|-----------------|
| **Note** | One-time entry | `kind: event` |
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

## Production entry points (unchanged)

- Home: `/argus/journal`
- Network: `/argus/network`
- Projects: entity pages under `/argus/projects/[id]`
