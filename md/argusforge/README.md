# ArgusForge — Library index

**Role:** Index for ArgusForge (AF) documentation inside MatrixTrade.  
**Sealed vision contract (prevails):** [`argusforge-contract.md`](argusforge-contract.md)  
**Technical Phase 0:** [`phase-0-architecture.md`](phase-0-architecture.md)  
**Vault detail:** [`vault-training-layer-contract.md`](vault-training-layer-contract.md)  
**Rule:** Do not contradict the sealed contract. Do not reduce AF to a notes app, universal memory, or a single-AI chat wrapper.

## Documents

| Document | Status | Responsibility |
|----------|--------|----------------|
| [argusforge-contract.md](argusforge-contract.md) | **Canonical — SEALED** | Vision, mission, formation transfer, component duties, success criteria |
| [phase-0-architecture.md](phase-0-architecture.md) | **Canonical — Phase 0 CLOSED** | Technical boundaries, names, Chaos/org/Registry, engine limits |
| [vault-training-layer-contract.md](vault-training-layer-contract.md) | **Canonical — Vault** | Vault prepares formation ≠ Memory |
| [alexandria-frozen-contract.md](alexandria-frozen-contract.md) | **FROZEN — binding** | Alexandria / Gatekeeper freeze |
| [alexandria-spatial-bottleneck-research.md](alexandria-spatial-bottleneck-research.md) | **Research — deferred, non-binding** | Historical spatial notes; not AF architecture |
| [external-repo-patterns-research.md](external-repo-patterns-research.md) | **Research** | External pattern references (no copy) |

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
2. [phase-0-architecture.md](phase-0-architecture.md) — technical Phase 0
3. [vault-training-layer-contract.md](vault-training-layer-contract.md)
4. [alexandria-frozen-contract.md](alexandria-frozen-contract.md)
5. [external-repo-patterns-research.md](external-repo-patterns-research.md)
6. [alexandria-spatial-bottleneck-research.md](alexandria-spatial-bottleneck-research.md) (optional, non-binding)

## Prototype route (UI slice only)

| Route | Status |
|-------|--------|
| `/forge` → `/forge/chaos` | Chaos Inbox prototype (session-local captures) |
| `/forge/task` | Placeholder — not implemented |
| `/forge/vault` | Placeholder — not implemented |

Aligns with sealed §23 first implementation priorities (shell + Chaos first). Does **not** invent premature Argus / Memory / MTA engines.
