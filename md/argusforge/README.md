# ArgusForge — Library index

**Role:** Umbrella integration environment inside the MatrixTrade repository.  
**Not:** Another application, another database, or a rewrite of MTA / ARGUS.

| Document | Status | Contents |
|----------|--------|----------|
| [phase-0-architecture.md](phase-0-architecture.md) | **Canonical proposal** | Map, **Memory Registry** decision, isolation, contracts, migration, risks |
| [alexandria-frozen-contract.md](alexandria-frozen-contract.md) | **FROZEN — binding** | Alexandria out of scope; preserve; no Forge merge; reopen only after study |
| [alexandria-spatial-bottleneck-research.md](alexandria-spatial-bottleneck-research.md) | **Research** | Bottleneck = spatial construction; AI = semantic→spatial (not graphics); deferred |

## Locked names

| Name | One-line |
|------|----------|
| **ArgusForge** | Hub — integrates products and engines (**not** a data store) |
| **Chaos** | General entry (capture first); creates identities |
| **Memory Registry** | Identity + pointers + shared context — **not** Database / Archive / Storage |
| **Argus Engine** | Relations, entities, evidence, placement |
| **MTA Engine** | Recurrence, metrics, temporality, attention / Focus signals |
| **ARGUS** | Private evidence product — owns **Argus Store** |
| **MTA** | Trading product — owns **MTA Store** |
| **Alexandria** | 3D knowledge product — **FROZEN** external; see frozen contract |
| **Vault** | AI output interface (future) |
| **Focus / Active / Archive** | Calculated **registry views** — not folders |

## Critical rule

Products own data. Memory owns identity. Engines enrich. Chaos registers the new.

## Reading order

1. [phase-0-architecture.md](phase-0-architecture.md) — especially §0.1 Memory Registry
2. [alexandria-frozen-contract.md](alexandria-frozen-contract.md) — Alexandria FROZEN; do not implement
3. [alexandria-spatial-bottleneck-research.md](alexandria-spatial-bottleneck-research.md) — future direction (deferred)
4. Existing islands: [`../argus/README.md`](../argus/README.md) · [`../matrix/README.md`](../matrix/README.md)
5. Chaos Coordination (today): [`../../tools/Chaos/README.md`](../../tools/Chaos/README.md)

**Phase rule:** Architecture before implementation. No code until a later phase cites a contract from the Phase 0 map.
