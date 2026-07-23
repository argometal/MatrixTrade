# ArgusForge — Library index

**Role:** Umbrella integration environment inside the MatrixTrade repository.  
**Not:** Another application, another database, or a rewrite of MTA / ARGUS.

| Document | Status | Contents |
|----------|--------|----------|
| [phase-0-architecture.md](phase-0-architecture.md) | **Canonical proposal** | Map, **Memory Registry** decision, isolation, contracts, migration, risks |

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
| **Alexandria** | Human KB / output — owns **Alexandria Store** |
| **Vault** | AI output interface (future) |
| **Focus / Active / Archive** | Calculated **registry views** — not folders |

## Critical rule

Products own data. Memory owns identity. Engines enrich. Chaos registers the new.

## Reading order

1. [phase-0-architecture.md](phase-0-architecture.md) — especially §0.1 Memory Registry
2. Existing islands: [`../argus/README.md`](../argus/README.md) · [`../matrix/README.md`](../matrix/README.md)
3. Chaos Coordination (today): [`../../tools/Chaos/README.md`](../../tools/Chaos/README.md)

**Phase rule:** Architecture before implementation. No code until a later phase cites a contract from the Phase 0 map.
