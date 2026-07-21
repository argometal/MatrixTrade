# UI naming — descriptive labels only

**Status:** Canonical (2026-07-21).  
**Product detail:** [../matrix/control-panel-ia.md](../matrix/control-panel-ia.md)

---

## Rule

UI labels must **name the thing the user gets or does**.

- Prefer payload names: Mechanics brief, Technical analysis, Playbook, Stock file, Scout desk, Update.
- Prefer route-aligned names: Trades, History, Insights.
- Reject poetic or overloaded renames that lose meaning (Session, Case, Desk without Scout, Closed trade inside Control).

## Hard bans for Control

1. Do **not** add Closed trade / forensic picker to Control.
2. Do **not** rename Mechanics brief → Session (or similar).
3. Do **not** fold Playbook or Technical analysis (MTAE) into another Control section.
4. Forensic export stays on `/trades/{id}` only.
5. Do **not** treat MTAE as the new Playbook — Playbook = HOW; MTAE = chart structure.

Violations are design bugs, not “simplifications.”
