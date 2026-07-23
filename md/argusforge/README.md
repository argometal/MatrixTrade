# ArgusForge — Library index

**Role:** Index for ArgusForge (AF) documentation inside MatrixTrade.  
**Canonical Phase 0 contract:** [`phase-0-architecture.md`](phase-0-architecture.md)  
**Canonical Vault contract:** [`vault-training-layer-contract.md`](vault-training-layer-contract.md)  
**Rule:** Do not duplicate or contradict those contracts in this file.

## Documents

| Document | Status | Responsibility |
|----------|--------|----------------|
| [phase-0-architecture.md](phase-0-architecture.md) | **Canonical — Phase 0 CLOSED** | AF identity, Chaos, org, Registry, engines, names, limits |
| [vault-training-layer-contract.md](vault-training-layer-contract.md) | **Canonical — Vault** | AI training interface ≠ Memory; mission, outputs, Chaos/Memory/engine relations |
| [alexandria-frozen-contract.md](alexandria-frozen-contract.md) | **FROZEN — binding** | Alexandria / Gatekeeper freeze |
| [alexandria-spatial-bottleneck-research.md](alexandria-spatial-bottleneck-research.md) | **Research — deferred, non-binding** | Historical spatial notes; not AF architecture |
| [external-repo-patterns-research.md](external-repo-patterns-research.md) | **Research** | External pattern references (no copy) |

## Canonical principle (pointer)

```text
Products own data. Memory owns identity. Argus relates. MTA observes time. Chaos captures. Vault trains the AI. ArgusForge coordinates.
```

Full AF Phase 0: [`phase-0-architecture.md`](phase-0-architecture.md).  
Full Vault: [`vault-training-layer-contract.md`](vault-training-layer-contract.md).

## Reading order

1. [phase-0-architecture.md](phase-0-architecture.md)
2. [vault-training-layer-contract.md](vault-training-layer-contract.md)
3. [alexandria-frozen-contract.md](alexandria-frozen-contract.md)
4. [external-repo-patterns-research.md](external-repo-patterns-research.md)
5. [alexandria-spatial-bottleneck-research.md](alexandria-spatial-bottleneck-research.md) (optional, non-binding)

## Out of scope here

Phase 1 engines, persistence APIs, agents, Alexandria.

## Prototype route (UI slice only)

| Route | Status |
|-------|--------|
| `/forge` → `/forge/chaos` | Chaos Inbox prototype (session-local captures) |
| `/forge/task` | Placeholder — not implemented |
| `/forge/vault` | Placeholder — not implemented |

Does **not** implement Memory, Argus Engine, MTA Engine, or Vault training packs.
