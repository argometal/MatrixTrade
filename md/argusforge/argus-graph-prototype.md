# Argus graph prototype (field start)

**Status:** prototype / browser-local  
**Not:** definitive Argus Engine schema · Alexandria · AI extraction · Cytoscape

## Patterns (only)

1. **Identifiable unit** — node with stable id; Chaos items map in when synced.
2. **Visible relation** — manual `link` edges (single provisional type).
3. **Operable selection** — select node → panel; connect handles → relation.

## Usage references (emulate, do not copy products)

- Logseq — ingest → units → links → graph view
- Anytype — object + modular selection (not P2P)
- React Flow — operable canvas (not Sigma scale viz)

## Route

`/forge/argus`

## Storage

`localStorage` key `argusforge-argus-graph-v1`  
Chaos source remains `argusforge-af03-repo-v1`.

## Caps

- **No design ceiling** on Chaos → Argus units. Sync takes all Chaos items.
- Demo fill (~24) is optional practice only, not a product max.
- UI may later page/filter for performance; that is not an ontological limit.

## CHANGE 24-02 (typed modular controls)

- Provisional unit types + named relations + basic groups + multi-select + filters
- Local state migrates v1→v2 (defaults; `link`→`related_to`); does not clear user data
- Sync preserves manually edited types; deterministic initial type only (Source/Event/Unknown)
