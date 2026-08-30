# MTA 010 — Prompt 003 — Local handoff

**Audience:** Cursor **Desktop / local** agent on Windows  
**Workspace:** `C:\Tools\MatrixTrade`  
**Status:** Hand off from Cloud Agent `argus` — remote work stops for this phase  
**Date:** 2026-08-28

---

## How to open this work (human)

1. Open **Cursor Desktop** on the Windows machine.
2. **File → Open Folder** → `C:\Tools\MatrixTrade`  
   (If missing: clone first — see § Remotes below.)
3. Open a **new Agent** chat (local, not Cloud).
4. Paste the block under **§ PASTE THIS INTO LOCAL AGENT** (entire block).
5. Optional: `@` this file or paste the Cloud Agent link for context:
   - Cloud Agent (read-only reference): https://cursor.com/agents/bc-01a002e5-64c6-770a-ae4b-1bba1716afba

The Cloud Agent **cannot** open Cursor on your PC. Local Agent must be started on the machine that has `C:\Tools`.

---

## Remotes & where things live

| What | Where |
|------|--------|
| **GitHub repo (only one)** | https://github.com/argometal/MatrixTrade |
| **Canonical remote** | `origin` → `github.com/argometal/MatrixTrade` |
| **Production app (DO NOT CHANGE)** | https://matrix-trade-theta.vercel.app |
| **Deploy pin (read only)** | `md/integrations/current-deploy.md` |
| **Product map (truth)** | `md/argusforge/IA-HANDOFF.md` |
| **Argus email inbound** | Cloudflare Email Routing + Worker `argus-email-intake` → Vercel API (domain `argometal.dev` — **RESERVED**, do not touch for this phase) |
| **Cloud Agent that planned this** | https://cursor.com/agents/bc-01a002e5-64c6-770a-ae4b-1bba1716afba |

**One monorepo. Do not create three repositories.**

### Target hostnames (future — NOT this phase)

| Hostname | App |
|----------|-----|
| `argusforge.dev` | Argus Forge |
| `argus.argusforge.dev` | Argus |
| `mta.argusforge.dev` | MatrixTrade |
| `argometal.dev` | RESERVED / PERSONAL — DO NOT TOUCH |

### Current path-based local entries (today)

| App | Local URL (same `npm run dev`) |
|-----|--------------------------------|
| MatrixTrade | `http://localhost:3000/home-preview` |
| Argus | `http://localhost:3000/argus/v2` |
| Forge | `http://localhost:3000/forge` |
| Apps chooser | `http://localhost:3000/apps` |

Auth today: `mt-auth` (trading) · `argus-auth` (Argus + Forge). Never set cookie `Domain=.argusforge.dev`.

---

## How local Agent can reach the Cloud Agent

Local Agent does **not** auto-read Cloud chats. Options:

1. **Paste** this file / the Prompt 003 block (preferred).
2. Give URL: `https://cursor.com/agents/bc-01a002e5-64c6-770a-ae4b-1bba1716afba`
3. If MCP `cursor-cloud` is available: `batch-fetch-details` with `bcIds: ["bc-01a002e5-64c6-770a-ae4b-1bba1716afba"]` + `includeTranscripts: true` (read via subagent; do not dump whole transcript).

---

## PASTE THIS INTO LOCAL AGENT

```text
MTA 010 — PROMPT 003
LOCAL PRODUCT SEPARATION — PHASE 1

You are Cursor LOCAL on Windows.
Working directory MUST be: C:\Tools\MatrixTrade
Remote MUST be: github.com/argometal/MatrixTrade (origin)

Cloud planning agent (reference only, do not continue work there):
https://cursor.com/agents/bc-01a002e5-64c6-770a-ae4b-1bba1716afba

Handoff doc in repo (if present):
md/argusforge/MTA010-PROMPT-003-LOCAL-HANDOFF.md

==================================================
TARGET ARCHITECTURE (future hosts — NO DNS YET)
==================================================

argusforge.dev            → Argus Forge
argus.argusforge.dev      → Argus
mta.argusforge.dev        → MatrixTrade
argometal.dev             → RESERVED / PERSONAL — DO NOT TOUCH

Keep ONE Git repository.
ONE MONOREPO → THREE APPLICATION BOUNDARIES → later THREE deployments.
Do NOT create three repositories.

==================================================
PRIMARY OBJECTIVE
==================================================

Transform the current monolithic product organization into clearly isolated
application boundaries LOCALLY first.

Nothing goes to production yet.
Validate all three products locally before ANY Vercel, DNS, Supabase, or production changes.

==================================================
SAFETY RULES
==================================================

1. Production is untouched.
2. Do not change Porkbun DNS.
3. Do not modify Vercel production configuration.
4. Do not delete the existing Vercel deployment.
5. Do not modify production Supabase schemas/data.
6. Do not rotate/change production secrets.
7. Do not split Git repositories.
8. Do not redesign UI.
9. Do not change product behavior.
10. Do not refactor business logic unless strictly required for separation.
11. Do not combine cleanup/sanitization with migration.
12. Do not delete legacy material during this phase.
13. Preserve Git history.
14. One logical migration step at a time.
15. Commit each verified step independently.

If an architectural ambiguity is discovered:
STOP AND REPORT.
Do not invent a solution.

==================================================
STEP 0 — PROTECT BASELINE
==================================================

Before modifying anything, confirm:

- working directory is C:\Tools\MatrixTrade
- remote is argometal/MatrixTrade
- current branch
- current HEAD
- origin/main HEAD
- git status
- no uncommitted changes that could be lost

Then:

git fetch origin
git checkout main
git reset --hard origin/main

Create dedicated branch from canonical origin/main:

git checkout -b mta010/product-separation-local

Record the baseline commit (origin/main SHA).

DO NOT continue if the working tree contains unexplained local changes.

==================================================
STEP 1 — DEFINE TARGET MONOREPO STRUCTURE
==================================================

Preferred conceptual target:

MatrixTrade/
├── apps/
│   ├── matrixtrade/
│   ├── argus/
│   └── forge/
├── packages/
│   └── shared/
├── infrastructure/
├── docs/
└── package/workspace configuration

BUT: Do NOT blindly implement this exact tree.

First inspect the existing Next.js architecture and determine whether
physically moving to apps/* now is the safest approach.

Objective = PRODUCT ISOLATION, not cosmetic directory cleanliness.

If moving the entire application structure in one operation introduces
unnecessary risk, propose an incremental intermediate structure.

STOP and report before major structural relocation.

==================================================
STEP 2 — ESTABLISH OWNERSHIP BOUNDARIES
==================================================

Classify runtime code into:

MATRIXTRADE | ARGUS | FORGE | SHARED

Allowed dependency direction:

MatrixTrade ─┐
Argus ───────┼──> Shared
Forge ───────┘

NOT allowed:

MatrixTrade → Argus
Argus → MatrixTrade
Forge → MatrixTrade business logic
Forge → Argus business logic

Cross-product navigation via URLs only.

==================================================
STEP 3 — SEPARATE APPLICATION ENTRY BOUNDARIES
==================================================

Three independently identifiable surfaces locally:

MATRIXTRADE | ARGUS | FORGE

Each needs clear: entry, routes, components, APIs, domain libs, config ownership.

They may still run from the SAME `npm run dev` process if splitting into
independent Next apps is not yet safe — but architecture must move toward
independently deployable apps.

==================================================
STEP 4 — AUTH BOUNDARIES
==================================================

MatrixTrade: mt-auth
Argus: argus-auth
Forge: must have an EXPLICIT auth decision (today Forge shares argus-auth —
report this; do not silently invent a third cookie without approval).

Cookies must ultimately be HOST-SCOPED.
Never configure: Domain=.argusforge.dev

Do not weaken existing authentication.
For local testing, preserve current behavior where necessary.

==================================================
STEP 5 — ENVIRONMENT OWNERSHIP
==================================================

Create ENV ownership inventory. Classify every variable:

MATRIXTRADE | ARGUS | FORGE | SHARED | LEGACY

Never expose secret VALUES in chat/commits.
Do not change production ENV.

==================================================
STEP 6 — DATABASE BOUNDARY
==================================================

DO NOT split databases yet.
Keep existing working data configuration.

Ownership (explicit only):

MTA / trading tables → MatrixTrade
argus_* tables → Argus
Forge → browser persistence only (no Forge DB)

Confirm no runtime cross-product DB dependencies.
If found: STOP AND REPORT.
Do not create a Forge database.

==================================================
STEP 7 — LOCAL APPLICATION VALIDATION
==================================================

After the first safe separation increment, validate:

MATRIXTRADE: loads, auth, dashboard, Playbook, Stock Files, Scouting Desk,
Plans/Thesis, Trades, Capital, Learning / LO / OBS / MAF, data, trading APIs

ARGUS: loads, auth, journal/evidence, inbox, network, orgs, projects, topics,
events, runbooks, graph/intelligence, attachments, deliver/export, data

FORGE: loads, Chaos, realms, decks, vault/library, browser persistence
survives refresh, navigation, NO dependency on MatrixTrade/Argus domain code

==================================================
STEP 8 — LOCAL HOSTNAME TARGET
==================================================

DO NOT configure public DNS.
localhost / path-based access is acceptable for first validation.
Do NOT introduce local hostname/proxy complexity until the three
application boundaries pass independently.

==================================================
STEP 9 — BUILD VALIDATION
==================================================

Run lint/typecheck as applicable, tests, production build.
Verify no forbidden cross-product imports.

Report PASS/FAIL for: MatrixTrade, Argus boundary, Forge boundary, Shared.

==================================================
STEP 10 — FIRST CHECKPOINT — STOP
==================================================

STOP after the FIRST SAFE SEPARATION INCREMENT.
Do not continue into Vercel or DNS.

Return exactly:

1. BASELINE
2. BRANCH CREATED
3. CURRENT STRUCTURE
4. TARGET STRUCTURE
5. FILES MOVED
6. FILES MODIFIED
7. SHARED DEPENDENCIES FOUND
8. CROSS-PRODUCT DEPENDENCIES FOUND
9. AUTH STATUS
10. DATABASE STATUS
11. MATRIXTRADE LOCAL TEST
12. ARGUS LOCAL TEST
13. FORGE LOCAL TEST
14. BUILD STATUS
15. COMMITS CREATED
16. RISKS / AMBIGUITIES
17. NEXT RECOMMENDED ATOMIC STEP

==================================================
CRITICAL STOP CONDITION
==================================================

If achieving three independently deployable apps requires a major
Next.js/workspace restructuring:

DO NOT execute that restructuring yet.
Present the exact proposed filesystem transformation and dependency impact first.

NO VERCEL CHANGES.
NO DNS CHANGES.
NO PRODUCTION CHANGES.
NO DATABASE MIGRATION.
NO LEGACY CLEANUP.

LOCAL SEPARATION ONLY.

Later phases (do NOT start):
004 → physical/deployable local (if needed)
005 → Vercel independent
006 → Porkbun subdomains
007 → prod validation + controlled retirement of old deployment
```

---

## If `C:\Tools\MatrixTrade` does not exist yet

```powershell
cd C:\Tools
git clone https://github.com/argometal/MatrixTrade.git MatrixTrade
cd MatrixTrade
git fetch origin
git checkout main
git reset --hard origin/main
copy .env.local.example .env.local   # then fill secrets locally — never commit
npm install
npm run dev
```

Runtime helpers (email tunnel etc.) often live under `C:\Tools\runtime\` (cloudflared, node) — do not invent paths; use what already exists on the machine.

---

## What NOT to ask the Cloud Agent to do for Prompt 003

- Do not run the separation on the Cloud VM as a substitute for `C:\Tools`.
- Do not push DNS / Vercel / prod changes from Cloud for this phase.
- Cloud Agent remains available for **QC / questions / transcript reference** only until local Phase 1 checkpoint is done.
