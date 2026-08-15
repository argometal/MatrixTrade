# UI naming — descriptive labels only

**Status:** Canonical (2026-08-15 · Prompt 15-12).  
**Product detail:** [../matrix/control-panel-ia.md](../matrix/control-panel-ia.md) · [../matrix/snapshot-catalog.md](../matrix/snapshot-catalog.md)

---

## Rule

UI labels must **name the thing the user gets or does**.

- Prefer payload / action names: **MTA Mechanics**, Stock Files, Apply, Technical Analysis, Playbook, Scout Desk, **MAF**.
- Prefer **copy-row** names that match the paste payload: Apply schema contract, MTAE protocol, Playbook snapshot, Scout desk overview, **MAF attribution protocol**, Dashboard snapshot.
- Prefer route-aligned window names: Trades, History, Insights.
- Reject poetic or overloaded renames that lose meaning (Session, Case, Desk without Scout, Closed trade inside Control, Request layer).

### Ontology (Prompt 15-12)

| Term | Meaning |
|------|---------|
| **UI label** | Exact visible button / copy-row text |
| **Snapshot ID** | Internal id — never ask the human to type it |
| **Protocol/schema** | Paste body content |
| **Route** | Implementation path |

Never describe as a visible copy label something the user cannot find literally.  
Nav names open drawers; they are **not** copy buttons unless a copy row uses the same text.

Canonical SNAPSHOT MENU: `lib/visible-snapshot-menu.ts` (single source — do not duplicate lists in Mechanics).

## Hard bans for Control

1. Do **not** add Closed trade / forensic picker to Control.
2. Do **not** rename MTA Mechanics → Session (or similar).
3. Do **not** fold Playbook or Technical Analysis (MTAE) into Mechanics.
4. Do **not** place Stock Files under Library.
5. Do **not** introduce a Request / Universal Request / Start Work prompt layer.
6. User-facing write path is **Apply** (not Update).
7. Forensic export stays on `/trades/{id}` only; forensic copy is evidence-only.
8. Do **not** treat MTAE as the new Playbook — Playbook = HOW; MTAE = chart structure + participation.
9. Do **not** ask the AI/human to “copy Learning” — Library nav is **MAF**; copy row is **MAF attribution protocol**.
10. Do **not** present Apply schema contract as a primary Control nav item — it is a copy row inside **MTA Mechanics**.

Violations are design bugs, not “simplifications.”
