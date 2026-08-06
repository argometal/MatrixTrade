# IA handoff — Apps · ARGUS · ArgusForge (runtime truth)

**Audience:** Cursor / ChatGPT / any coding agent  
**Status:** Living — rewrite when runtime changes; do not accumulate shipped dumps here  
**Repo:** https://github.com/argometal/MatrixTrade  
**Prod:** https://matrix-trade-theta.vercel.app  
**Deploy pin:** `md/integrations/current-deploy.md` (tag on `origin/main`)  
**Date:** 2026-08-06

External analysis text was **not** attached to the request that created this file. This handoff is **runtime truth from `main`**, not a transcript of an external memo.

---

## Product map (three apps)

| App | Entry | Login | Cookie / env |
|-----|-------|-------|----------------|
| **MTA** (trading) | `/home-preview` | `/login` | `mt-auth` · `MATRIXTRADE_PASSWORD` |
| **ARGUS** | `/argus/v2` | `/argus/login` | `argus-auth` · `ARGUS_PASSWORD` (legacy `HEALTH_VAULT_PASSWORD`) |
| **ArgusForge** | `/forge` | same as ARGUS (`requireArgusSession`) | same `argus-auth` |

**Chooser:** `/apps` lists MTA · ARGUS · ArgusForge. Chrome switches live in `AppExchangeActions` (MTA / ARGUS / Forge headers).

**Root:** `/` → `/home-preview` (not `/apps`).

Auth is **fail-open**: if the password env is unset, that gate does not redirect.

**Guest workstation lock (shipped):** Settings at `/settings/security` and `/argus/v2/settings/security`. Account schedule in Supabase `guest_lock_policy_state` (`supabase/guest-lock-policy.sql`). Cookie is a mirror + Edge fallback. Password override lasts **30 minutes**. See `current-deploy.md` for PR ids.

---

## ArgusForge — what it is

Coordination / capture shell under `/forge`. Local-first repo (`localStorage` + IndexedDB assets). **Do not** mix ArgusForge store logic with MTA trading or ARGUS journal Supabase tables.

### Visible ontology

```text
Realm (root folder)
└── Folder (nested, optional)
    └── Chaos Deck
        └── Fragment
            └── Block
```

Modes (not ancestors): Viewer ⇄ Classic ⇄ Builder. Fullscreen = capture overlay, not a route.

### Capture invariant

`/forge/chaos` and `/forge/deck/[deckId]` share `persistChaosDumpCapture`. Text + images = one capture; success only when assets + Fragment + Blocks persist.

### Key routes

| Route | Role |
|-------|------|
| `/forge` | Knowledge Explorer |
| `/forge/chaos` | Chaos Dumping capture |
| `/forge/deck/[deckId]` | Deck capture / search / grid |
| `/forge/argus` | Realm Treemap (experimental) |
| `/forge/argus/units` | Units / molecular graph |
| `/forge/realm/[realmId]` | Realm graph UI |
| `/forge/vault` | Prepared output |

Living capability table: `md/argusforge/capability-map.md`. Consolidation history: `md/argusforge/change-24-47.md`.

### Auth note (current main)

- Forge **layout** calls `requireArgusSession({ next: "/forge" })`.
- Middleware Argus cookie check currently covers `/argus/*` only; guest-lock expiry on `/forge` may send users to **MTA** `/login` instead of `/argus/login`. Prefer fixing middleware to treat `/forge` like Argus when changing auth again.

---

## ARGUS deliver (pointer)

Deliver v1 is live: Quick Package (HTML + MD) + Evidence Vault. Details: `md/argus/export-delivery-handoff.md`. Charter: `md/argus/ai-charter.md`.

---

## Open debt (do not invent more)

| Item | Status |
|------|--------|
| PR **#110** Recent linkage on `/forge/argus` | Draft — Pending; test `npm run test:argus-recent-linkage`; do **not** treat as shipped |
| Scout Learning P1 hub section | Only after auth; P0 visibility already on main |
| AI Trading Session (ChatGPT HTTP auth) | **DISABLED** by platform limits — `md/integrations/ai-trading-session-handoff.md` |

---

## Hard rules for agents

1. Prefer `current-deploy.md` + this file + `capability-map.md` over old `*handoff*` dumps.
2. Do not merge superseded PRs (#108, #112 closed into #113).
3. Do not touch MTA Apply / Scout / Capital / trading P&L when working ArgusForge UI.
4. Do not claim shipped without merge + production Ready.
5. If a handoff contradicts code, **code wins** — fix or delete the handoff.

---

## Deleted / superseded docs (do not revive)

These were misleading and removed (or should stay deleted):

- `md/argus/export-delivery-handoff-for-analysis.txt` — claimed Deliver not implemented
- `md/integrations/vercel-argus-production-handoff.md` — obsolete “no nav / empty ARGUS” diagnosis
- `md/integrations/guest-workstation-lock-handoff.md` — pre-impl design left as “review before implement” after ship
- `md/matrix/scout-learning-p0-visibility-handoff.md` — claimed not merged after P0 landed on main
- `md/matrix/plan-map-ai-execution-sentence-handoff.md` — claimed draft after #132 shipped
