# ArgusForge — Library index

**Role:** Index for ArgusForge (AF) documentation inside MatrixTrade.  
**Sealed vision contract (prevails):** [`argusforge-contract.md`](argusforge-contract.md)  
**Sealed evolution addendum:** [`perpetual-evolution-contract.md`](perpetual-evolution-contract.md)  
**Working interface checklist:** [`af03-chaos-interface-contract.md`](af03-chaos-interface-contract.md)  
**Technical Phase 0:** [`phase-0-architecture.md`](phase-0-architecture.md)  
**Vault detail:** [`vault-training-layer-contract.md`](vault-training-layer-contract.md)  
**Rule:** Do not contradict the sealed contracts. No AF implementation is final. Do not reduce AF to a notes app, universal memory, or a single-AI chat wrapper. Do not treat `/forge/chaos` as functional Chaos.

## Documents

| Document | Status | Responsibility |
|----------|--------|----------------|
| [argusforge-contract.md](argusforge-contract.md) | **Canonical — SEALED** | Vision, mission, formation transfer, component duties, success criteria |
| [perpetual-evolution-contract.md](perpetual-evolution-contract.md) | **Canonical — SEALED addendum** | Perpetual evolution; evidence; reversible change; user agency |
| [af03-chaos-interface-contract.md](af03-chaos-interface-contract.md) | **Working contract — checklist** | Minimal Chaos interfaces → Vault boundary; completion Definition of Done |
| [phase-0-architecture.md](phase-0-architecture.md) | **Canonical — Phase 0 CLOSED** | Technical boundaries, names, Chaos/org/Registry, engine limits |
| [vault-training-layer-contract.md](vault-training-layer-contract.md) | **Canonical — Vault** | Vault prepares formation ≠ Memory |
| [alexandria-frozen-contract.md](alexandria-frozen-contract.md) | **FROZEN — binding** | Alexandria / Gatekeeper freeze |
| [alexandria-spatial-bottleneck-research.md](alexandria-spatial-bottleneck-research.md) | **Research — deferred, non-binding** | Historical spatial notes; not AF architecture |
| [external-repo-patterns-research.md](external-repo-patterns-research.md) | **Research** | External pattern references (evaluate before reuse) |

## Canonical principle (pointer)

```text
Products own data.
Memory owns identity.
Argus relates.
MTA observes time.
Chaos captures.
Vault prepares formation.
ArgusForge coordinates.
```

Full sealed text: [`argusforge-contract.md`](argusforge-contract.md).

## Reading order

1. [argusforge-contract.md](argusforge-contract.md) — vision (sealed)
2. [perpetual-evolution-contract.md](perpetual-evolution-contract.md) — evolution addendum (sealed)
3. [af03-chaos-interface-contract.md](af03-chaos-interface-contract.md) — interface checklist (working)
4. [phase-0-architecture.md](phase-0-architecture.md) — technical Phase 0
5. [vault-training-layer-contract.md](vault-training-layer-contract.md)
6. [alexandria-frozen-contract.md](alexandria-frozen-contract.md)
7. [external-repo-patterns-research.md](external-repo-patterns-research.md)
8. [alexandria-spatial-bottleneck-research.md](alexandria-spatial-bottleneck-research.md) (optional, non-binding)

## Current UI (AF03 progress)

| Route | Status |
|-------|--------|
| `/forge` | Home overview (ArgusForge) or MTA overview when system=MTA |
| `/forge/library` | Library — AF repository browse / MTA library links |
| `/forge/active` | Active — AF active repo / MTA active deep-links |
| `/forge/archive` | Archive — AF archive repo / MTA archive deep-links |
| `/forge/vault` | Vault shell + **Vault \| Alexandria** selector (Alexandria frozen disclosure) |
| `/forge/deck/[deckId]` | Chaos Deck internal view |
| `/forge/deck/[deckId]/item/[itemId]/view` | Content Viewer |
| `/forge/deck/[deckId]/item/[itemId]` | Basic content editor |
| `/forge/focus` | **Hidden** from nav — deprecated/pending signals only |
| `/forge/chaos` | Legacy capture prototype |

**Shell:** bottom nav `Home | Library | Vault | Active | Archive`. Header system selector `ArgusForge | MTA` (persisted). Focus removed from nav.

Storage: `localStorage` repo + vault-prep + `argusforge-selected-system-v1` + `argusforge-vault-mode-v1`.

**Open debt:** [DEBT-AF03-01](af03-chaos-interface-contract.md#debt-af03-01--active--archive-are-filters-not-twin-creation-surfaces) — create still should not be twin birth worlds; Focus design later.
