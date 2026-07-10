# MatrixTrade — Design checklists

Functional verification for preview UI surfaces. **User checks each box in the browser** after deploy or redesign.

**Library tier:** Runtime (must match deployed code).  
**Deferred UI ideas:** `md/concepts/deferred-matrixtrade.md`

## Index

| Screen | Route | Checklist | Component |
|--------|-------|-----------|-----------|
| Feature audit | all | [features-used-vs-unused-checklist.md](features-used-vs-unused-checklist.md) | Runtime inventory |
| Route map | all | [legacy-vs-preview-map.md](legacy-vs-preview-map.md) | Preview active + legacy preserved |
| Parity sign-off | preview | [new-mode-parity-checklist.md](new-mode-parity-checklist.md) | Migration complete — user QA |
| Home (Situation Room) | `/home-preview` | [home-preview-checklist.md](home-preview-checklist.md) | `PreviewDashboard` |
| New Trade | `/trades-preview` | [trades-preview-checklist.md](trades-preview-checklist.md) | `TradesWorkspace` |
| Journal | `/journal` | [journal-preview-checklist.md](journal-preview-checklist.md) | `PreviewJournal` |
| Planning | `/planning` | [planning-module-proposal.md](planning-module-proposal.md) | `PreviewPlanning` (Phase 0 shipped) |
Template for new screens: [DESIGN-CHECKLIST-TEMPLATE.md](DESIGN-CHECKLIST-TEMPLATE.md)

## Workflow

1. **Implement or change UI** → update the matching checklist in the same PR/commit.
2. **Bump metadata** at the top: `Last design version` (date + git commit hash).
3. **Changelog** — add a row under `## Changelog` describing what changed.
4. **Reset boxes** — if behavior or layout changed, turn checked items back to `- [ ]` for anything affected.
5. **User sign-off** — user checks boxes in production or local; report failures in chat.
6. **Redesign** — reset all boxes; do not delete history (use Changelog).

## Agent rule

See `.cursor/rules/design-checklists.mdc` — agents must update these files whenever preview or major UI code changes.
