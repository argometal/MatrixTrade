# ArgusForge — Library index

**Role:** Umbrella integration environment inside the MatrixTrade repository.  
**Not:** Another application, another database, or a rewrite of MTA / ARGUS.

| Document | Status | Contents |
|----------|--------|----------|
| [phase-0-architecture.md](phase-0-architecture.md) | **Sealed** | Map, **Memory Registry**, isolation, migration, risks |
| [phase-1-infrastructure.md](phase-1-infrastructure.md) | **Active** | Models/contracts start — Chaos, org, Argus, MTA reserved, AI proposals |
| [alexandria-frozen-contract.md](alexandria-frozen-contract.md) | **FROZEN — binding** | Alexandria out of scope; preserve; no Forge merge; reopen only after study |
| [alexandria-spatial-bottleneck-research.md](alexandria-spatial-bottleneck-research.md) | **Research** | Bottleneck = spatial construction; AI = semantic→spatial (not graphics); deferred |

## Locked names

| Name | One-line |
|------|----------|
| **ArgusForge** | Hub — integrates products and engines (**not** a data store) |
| **Chaos** | Capture unit (unbounded parts); creates identities |
| **Memory Registry** | Identity + pointers + shared context — **not** Database / Archive / Storage |
| **Argus Engine** | *What is related to what?* — relations, discovery, enrichment |
| **MTA Engine** | *What happens over time?* — temporal behavior of knowledge (**reserved** in Phase 1) |
| **ARGUS** | Private evidence product — owns **Argus Store** |
| **MTA** | Trading product — owns **MTA Store** |
| **Alexandria** | 3D knowledge product — **FROZEN** external; see frozen contract |
| **Vault** | AI output interface (future) |
| **Focus / Active / Archive** | Operational states; folders = user org only; never replace relations |

## Critical rules

1. Products own data. Memory owns identity. Engines enrich. Chaos registers the new.  
2. **Argus ≠ MTA Engine** — relations vs temporal behavior; never mix.  
3. Alexandria FROZEN — no spatial / renderer work in Forge.

## Code (Phase 1)

`lib/argusforge/` — contracts + thin JSON registry index (`data/forge/`, gitignored).

## Reading order

1. [phase-0-architecture.md](phase-0-architecture.md) — sealed map (§0.1 Memory Registry)
2. [phase-1-infrastructure.md](phase-1-infrastructure.md) — current build rules
3. [alexandria-frozen-contract.md](alexandria-frozen-contract.md) — do not implement Alexandria
4. [alexandria-spatial-bottleneck-research.md](alexandria-spatial-bottleneck-research.md) — deferred
5. Existing islands: [`../argus/README.md`](../argus/README.md) · [`../matrix/README.md`](../matrix/README.md)
6. Chaos Coordination (today): [`../../tools/Chaos/README.md`](../../tools/Chaos/README.md)
