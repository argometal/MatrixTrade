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
| `/forge` | Minimal Home — links to Active / Archive; Focus pending |
| `/forge/active`, `/forge/active/f/[id]` | Active repository view (§2–3) |
| `/forge/archive`, `/forge/archive/f/[id]` | Archive repository view (§2–3) |
| `/forge/focus` | Focus pending disclosure |
| `/forge/chaos` | Legacy capture prototype (sessionStorage) — not Chaos Deck |

Storage for §1–3: browser `localStorage` (`argusforge-af03-repo-v1`). Not server persistence.
