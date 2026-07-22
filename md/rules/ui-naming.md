# UI naming — descriptive labels only

**Status:** Canonical (2026-07-22).  
**Product detail:** [../matrix/control-panel-ia.md](../matrix/control-panel-ia.md)

---

## Rule

UI labels must **name the thing the user gets or does**.

- Prefer payload / action names: Matrix Mechanics, Stock Files, Apply, Technical Analysis, Playbook, Scout Desk, Learning.
- Prefer route-aligned names: Trades, History, Insights.
- Reject poetic or overloaded renames that lose meaning (Session, Case, Desk without Scout, Closed trade inside Control, Request layer).

## Hard bans for Control

1. Do **not** add Closed trade / forensic picker to Control.
2. Do **not** rename Matrix Mechanics → Session (or similar).
3. Do **not** fold Playbook or Technical Analysis (MTAE) into Mechanics.
4. Do **not** place Stock Files under Library.
5. Do **not** introduce a Request / Universal Request / Start Work prompt layer.
6. User-facing write path is **Apply** (not Update).
7. Forensic export stays on `/trades/{id}` only; forensic copy is evidence-only.
8. Do **not** treat MTAE as the new Playbook — Playbook = HOW; MTAE = chart structure + participation.

Violations are design bugs, not “simplifications.”
