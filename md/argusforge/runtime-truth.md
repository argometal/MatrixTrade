# ArgusForge — Runtime truth

**Status:** Canonical — refresh when shipping  
**Last updated:** 2026-07-24  
**Production:** https://matrix-trade-theta.vercel.app/forge  
**Pin:** follow `md/integrations/current-deploy.md` when present  

---

## What works today

| Area | Truth |
|------|-------|
| Shell | Home · Argus · + · Prepared output; system toggle ArgusForge \| MTA |
| Home | Traditional Overview / Recent dashboard — **not** Treemap |
| Active / Archive | Traditional `RepositoryView` lists; folders + decks |
| Argus | Realm Treemap with `?filter=focus\|active\|archive` |
| Realm | Molecular Chaos Deck graph (React Flow) |
| Chaos Deck | Fragments list/grid, capture, rename, move between decks (as implemented) |
| Vault | Local prep queue + Alexandria frozen disclosure |
| Unit graph | `/forge/argus/units` — Fragment units + manual relations |
| Persistence | `localStorage` keys (repo, vault-prep, system, argus-graph, molecular overlay, layout) |

---

## What does **not** work / not claimed

| Claim | Reality |
|-------|---------|
| MTA scoring in AF UI | Not implemented — fields prepared only |
| AI extraction | Not implemented |
| Alexandria / 3D | FROZEN — not integrated |
| Server AF database | None — browser local only |
| Focus intelligence | Pending — filter shows Active Realms |
| Final mass / recurrence formulas | Provisional only |
| `/forge/chaos` | Legacy capture prototype — not functional Chaos |

---

## Storage keys (prototype)

| Key | Content |
|-----|---------|
| `argusforge-af03-repo-v1` | Folders, decks, items, usage defaults |
| `argusforge-argus-graph-v1` | Unit graph state |
| `argusforge-realm-molecular-v1` | Affinity overlay placeholders |
| `argusforge-realm-deck-layout-v1` | Node positions per Realm |
| `argusforge-selected-system-v1` | ArgusForge \| MTA |
| `argusforge-vault-mode-v1` | Vault \| Alexandria selector |
| vault-prep store | Review queue |

Safe defaults on read — **do not clear** user data on migrate.

---

## Code map (entry)

| Concern | Path |
|---------|------|
| Shell | `app/forge/components/ForgeShell.tsx` |
| Home | `app/forge/components/ForgeHomeDashboard.tsx` |
| Lists | `app/forge/components/RepositoryView.tsx` |
| Treemap | `app/forge/components/RealmMapTree.tsx` |
| Molecular graph | `app/forge/components/RealmDeckGraph.tsx` |
| Metrics | `lib/argusforge/af03-realm-map.ts` |
| Repo store | `lib/argusforge/af03-repo-store.ts` |
| Unit engine | `app/forge/components/ArgusGraphView.tsx` |

---

## Related

- Direction: [`vision-and-direction.md`](vision-and-direction.md)  
- Backlog: [`building-backlog.md`](building-backlog.md)  
- Changes: [`changes-numbered.md`](changes-numbered.md)  
