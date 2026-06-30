# MD Library — Matrix / MatrixTrade

**Start here.** This folder is the documentation source of truth.  
If you need architecture, rules, integrations, or roadmap — it lives here.  
**Enough to reconstruct the entire system** without guessing.

Private repo: `github.com/argometal/MatrixTrade`

---

## How to use

1. **New to the project?** Read in order: `architecture/system-overview.md` → `architecture/repo-structure.md` → `phases/roadmap.md`
2. **Looking for a rule?** → `rules/`
3. **How does X connect to ChatGPT/Obsidian?** → `integrations/`
4. **Copy/paste protocols?** → `protocols/`
5. **Adding a new topic?** Create `topics/your-topic.md` and add a line to this index.

---

## Architecture

| Document | Contents |
|----------|----------|
| [system-overview.md](architecture/system-overview.md) | Layers: app, vault, repo, ChatGPT |
| [repo-structure.md](architecture/repo-structure.md) | All top-level folders |
| [matrixtrade-app.md](architecture/matrixtrade-app.md) | Next.js app, pages, lib |
| [data-flow.md](architecture/data-flow.md) | Create trade → Obsidian → export → ChatGPT |

---

## Rules

| Document | Contents |
|----------|----------|
| [experiment-cycle.md](rules/experiment-cycle.md) | H001–H030, P/L, limits, validation |
| [investment-principles.md](rules/investment-principles.md) | Capital preservation, discipline, framework |
| [data-ownership.md](rules/data-ownership.md) | App vs Obsidian vs you |
| [immutability-and-history.md](rules/immutability-and-history.md) | Never delete, version, append |

---

## Integrations

| Document | Contents |
|----------|----------|
| [obsidian.md](integrations/obsidian.md) | Vault, frontmatter, note body |
| [chatgpt-bridge.md](integrations/chatgpt-bridge.md) | Export, sync control, ChatGPT role |
| [github-and-privacy.md](integrations/github-and-privacy.md) | Private repo, gitignore, what syncs |
| [mobile-connect.md](integrations/mobile-connect.md) | QR codes, local network access |

---

## Protocols

| Document | Contents |
|----------|----------|
| [export-context.md](protocols/export-context.md) | Copy Full Context format |
| [import-handoff-v1.md](protocols/import-handoff-v1.md) | MT-IMPORT / MT-UPDATE (planned) |

---

## Phases

| Document | Contents |
|----------|----------|
| [roadmap.md](phases/roadmap.md) | Phase 0–4 status and next steps |

---

## Topics

Add one `.md` per subject as the system grows.

| Document | Contents |
|----------|----------|
| [companies-model.md](topics/companies-model.md) | Per-ticker folder structure |
| [decision-framework.md](topics/decision-framework.md) | Why this company, why now |
| [analysis-workflow.md](topics/analysis-workflow.md) | Multi-timeframe workflow |

---

## Legacy pointers (root files)

These remain at repo root for compatibility; **md/ is canonical**:

| Root file | Canonical md doc |
|-----------|------------------|
| `MATRIX-v2-VISION.md` | Summarized across md/; see `architecture/system-overview.md` |
| `MatrixTrade-IP01.md` | `rules/experiment-cycle.md` |
| `vault/ORM/*.md` | Technical detail; see `architecture/matrixtrade-app.md` + `integrations/obsidian.md` |

---

## Adding new documentation

```text
md/topics/new-subject.md   ← new topic
md/README.md               ← add one row to the index
```

Keep documents **simple**, one topic per file, plain markdown.
