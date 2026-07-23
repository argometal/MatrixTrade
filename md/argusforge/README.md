# ArgusForge — Library index

**Role:** Umbrella integration environment inside the MatrixTrade repository.  
**Not:** Another application, another database, or a rewrite of MTA / ARGUS.

| Document | Status | Contents |
|----------|--------|----------|
| [phase-0-architecture.md](phase-0-architecture.md) | **Canonical proposal** | Map, isolation, folders, contracts, migration, risks |

## Locked names

| Name | One-line |
|------|----------|
| **ArgusForge** | Hub — integrates products and engines |
| **Chaos** | General entry (capture first) |
| **Memory** | Persistent memory; Focus / Active / Archive are calculated views |
| **Argus Engine** | Relations, entities, evidence, placement |
| **MTA Engine** | Recurrence, metrics, temporality, attention / Focus signals |
| **ARGUS** | Private evidence product (unchanged) |
| **MTA** | Trading product (unchanged) |
| **Vault** | AI output interface (future) |
| **Alexandria** | Human output interface (future) |

## Reading order

1. [phase-0-architecture.md](phase-0-architecture.md)
2. Existing islands: [`../argus/README.md`](../argus/README.md) · [`../matrix/README.md`](../matrix/README.md)
3. Chaos Coordination (today): [`../../tools/Chaos/README.md`](../../tools/Chaos/README.md)

**Phase rule:** Architecture before implementation. No code until a later phase cites a contract from the Phase 0 map.
