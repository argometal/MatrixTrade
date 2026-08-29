# Product ownership boundaries

**Status:** Living — MTA 010 Prompt 007  
**Scope:** Guardrails before physical `apps/*` separation  
**Rule:** Do not move domain code into Shared to silence lint.

Related: architecture audit (Prompt 005), [`IA-HANDOFF.md`](IA-HANDOFF.md), [`capability-map.md`](capability-map.md).

---

## Products

| Product | Identity | Primary surfaces |
|---------|----------|------------------|
| **MATRIXTRADE** | Trading lab (UI: MatriXTrade) | `app/(trading)/`, most of `app/components/`, `app/api/{ai,matrix,trading}/`, `lib/*` root trading modules, `bridge/`, `data/` (trading JSON) |
| **ARGUS** | Evidence / intelligence product | `app/argus/`, `app/api/argus/`, `lib/argus/`, `argus-email-bridge/` |
| **ARGUS FORGE** | Formation / capture coordination | `app/forge/`, `lib/argusforge/` |
| **SHARED** | Infrastructure + ecosystem shell | `lib/auth/`, `lib/supabase/`, `middleware.ts`, `app/apps/`, `app/auth/`, root `app/layout.tsx`, guest TZ / lock chrome |

Chaos is an **interface/layer inside ARGUS FORGE**, not a parent product of Alexandria or Vault.

---

## Path ownership (summary)

| Path | Owner | Notes |
|------|-------|-------|
| `app/(trading)/` | MATRIXTRADE | |
| `app/login/`, `app/scout-access/` | MATRIXTRADE | |
| `app/components/` | MATRIXTRADE (+ SHARED chrome) | Preview/trades/scout = MT. `AppExchangeActions`, guest lock, `SignOutButton` = SHARED shell |
| `app/api/ai/`, `app/api/matrix/`, `app/api/trading/` | MATRIXTRADE | |
| `app/argus/`, `app/api/argus/`, `lib/argus/` | ARGUS | |
| `argus-email-bridge/` | ARGUS | Worker package |
| `app/forge/`, `lib/argusforge/` | ARGUS FORGE | |
| `lib/auth/`, `lib/supabase/`, `middleware.ts` | SHARED | |
| `app/apps/` | SHARED | Ecosystem portal / systems registry |
| `app/auth/` | SHARED | Dual login actions |
| `bridge/` | MATRIXTRADE | CF worker |
| `supabase/` | MIXED | SQL by domain (trading vs `argus-*`); do not invent finer ownership here |
| `data/` | MIXED | Mostly MATRIXTRADE JSON; Argus may use `data/argus` locally |
| `tools/` | MIXED | Tests/scripts by product prefix; not a runtime boundary |
| `vault/` (repo root) | MATRIXTRADE | Obsidian TradingVault — **not** AF Vault |
| `lib/*` root modules | MATRIXTRADE (default) | Exceptions: none claimed as Shared domain. Accidental Argus use of snapshot helpers is a **known exception**, not Shared ownership |

Ambiguous files: leave unmarked; do not invent owners.

---

## Allowed dependency direction

```text
MATRIXTRADE ─┐
ARGUS ───────┼──► SHARED
ARGUS FORGE ─┘
```

Navigation via URLs/routes is **not** domain coupling.

---

## Forbidden domain dependencies

| From | Must not import |
|------|-----------------|
| ARGUS FORGE (`app/forge`, `lib/argusforge`) | ARGUS domain (`lib/argus`, `app/argus`) · MATRIXTRADE domain (`app/(trading)`, trading `lib/*` prefixes) |
| ARGUS (`app/argus`, `lib/argus`, `app/api/argus`) | ARGUS FORGE domain (`lib/argusforge`, `app/forge`) · MATRIXTRADE trading domain libs |
| MATRIXTRADE (`app/(trading)`, `app/api/{ai,matrix,trading}`, most `app/components`) | ARGUS domain · ARGUS FORGE domain |

SHARED may import product modules only for edge routing / portal registry (see exceptions).

---

## Known existing exceptions (do not expand)

| Exception | Classification | Handling |
|-----------|----------------|----------|
| `middleware.ts` → `@/lib/argus/argus-legacy-redirects` | SHARED edge → ARGUS redirects | Allowed (SHARED file; not under product lint zones) |
| ARGUS Network + `lib/argus/network-ai-*` → `@/lib/snapshot-types`, `@/lib/snapshot-verification`, `@/lib/apply-failure-snapshot` | Accidental ARGUS → MATRIXTRADE-origin helpers | **Allowed until a later dedicated extract** — not Shared domain |
| ARGUS Network UI → `@/app/components/ai-bridge/copy-text` | Accidental path coupling | **Allowed until later** |
| Product chrome → `@/app/apps/components/ForgePortalNav` / `AppExchangeActions` | Ecosystem shell | Allowed (SHARED) |
| `app/forge/layout.tsx` → `requireArgusSession` (`lib/auth`) | Forge rides Argus auth cookie | Allowed (SHARED auth); product auth split is a later prompt |
| `ForgeShell` → `AppExchangeActions` | Shell chrome | Allowed (SHARED) |

Do **not** add broad wildcards that re-open trading ↔ Argus ↔ Forge domain imports.

---

## Future extraction order

Evidence (Prompt 005): Forge domain is most self-contained; MatrixTrade dominates root `lib/` + `app/components`.

1. **Argus Forge** (`app/forge` + `lib/argusforge`)  
2. **ARGUS** (`app/argus` + `lib/argus` + APIs + email bridge)  
3. **MatriXTrade** (remaining Next core)

Physical `apps/*` is **out of scope** for this increment.

---

## Enforcement

ESLint `no-restricted-imports` overrides in `.eslintrc.json` apply to product path globs.

Runtime behavior must not change.
