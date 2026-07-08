# MatrixTrade — Design checklists

Functional verification lists for preview and major UI surfaces. **User checks each box in the browser** after deploy or redesign.

## Index

| Screen | Route | Checklist | Source component |
|--------|-------|-----------|------------------|
| **Mode map** | all | [legacy-vs-preview-map.md](legacy-vs-preview-map.md) | Legacy vs preview routes + disable plan |
| **Parity audit** | preview | [new-mode-parity-checklist.md](new-mode-parity-checklist.md) | Features to port before retiring classic |
| Home preview (Situation Room) | `/home-preview` | [home-preview-checklist.md](home-preview-checklist.md) · [solutions](home-preview-solutions.md) | `PreviewShell` · `PreviewDashboard` |
| New Trade | `/trades-preview` | [trades-preview-checklist.md](trades-preview-checklist.md) | `PreviewShell` · `TradesWorkspace` |

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
