# Thesis ownership — Playbook vs Stock Profile

## A-Iteration

User-defined rules are primary.
This Library MD is the source of A-Iteration Anchors for its scope.
A-Iteration Anchors preserve the user's exact words.
AI never rewrites or reinterprets them.
If conflict or ambiguity exists, AI must negotiate with the user.
Respect ontology. Do not invent.
Only present what canonically exists in the epistemology.
If the required epistemology does not exist, do not add it; stop and report it.
Never change a user-defined A-Iteration rule.
Preserve A-Iteration Anchors.
Preserve what works.
Change only what is necessary.
Do not fix what does not block.
Verify the result.


**Status:** Canonical (2026-07-11).  
**Parent:** [strategic-planning-vision.md](strategic-planning-vision.md)

---

## Rule

| Layer | Owns | Does not own |
|-------|------|----------------|
| **Playbook** (HOW) | Reusable method: rules, checklist, status, observation horizons (ADR-0001), forbidden errors | Per-ticker price thesis, zones, or “why this stock now” |
| **Stock Profile** (WHO) | Ticker dossier: `currentHypothesis`, levels, invalidation, minimum R:R, evidence, `thesis` narrative | Generic entry rules that apply to every symbol |
| **Scout / PLAN** | Tactical window: entry, stop, target, validity dates, link to playbook + profile | Long-term strategic memory (lives on profile) |
| **Trade** | Execution record: fills, size, P/L, review | Method definition or dossier |

**The investment thesis for a ticker lives on the Stock Profile**, not on the Playbook.

Playbook answers: *How do we trade this kind of setup?*  
Stock Profile answers: *What do we believe about this symbol right now, at these levels?*

---

## Fields (today)

### Stock Profile

- `currentHypothesis` — active belief (short, versioned)
- `thesis` — optional longer narrative (AI reasoning snapshot)
- `levels`, `riskRules.invalidation`, `riskRules.minimumRR`
- Evidence rows (append-only market observations)

### Playbook

- `name`, `description`, `checklist`, `status`
- Future: `expectedHorizonDays`, `maximumObservationDays` (inherited by trades per ADR-0001)

### Scout plan

- `thesis` — **tactical** note for this window only (may echo profile hypothesis; not a second dossier)

---

## AI updates

| Intent | Block type |
|--------|------------|
| Change belief / levels on a ticker | `file-update` |
| Validate or challenge dossier | `scout-assessment` |
| Scout go/wait/no on a PLAN | `decision-update` |
| New dossier + optional initial scout | `stock-case-create` |
| Change method rules | `playbook-update` |

User does not retype thesis in Matrix forms — copy profile snapshot → external AI → Apply returned block.

---

## Related

- [external-ai-policy.md](external-ai-policy.md)  
- [stock-profile-design.md](stock-profile-design.md)  
- [scout-execution-model.md](scout-execution-model.md)  
