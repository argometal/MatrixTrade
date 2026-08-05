# Guest workstation session lock — design handoff (REVIEW BEFORE IMPLEMENT)

**Status:** Implemented (v1+) — Settings at `/settings/security` + `/argus/v2/settings/security`.  
**Date:** 2026-08-05  
**Repo:** https://github.com/argometal/MatrixTrade  
**Prod today:** https://matrix-trade-theta.vercel.app · tag `main0805d`  
**Intent:** Safe work on **guest / shared computers** — if the user forgets to close the app, access expires and credentials are required again.

**v1+ (password override + account policy):**
- Emulates Apple Screen Time **Ignore Limit**, but override is fixed at **30 minutes** (not the session timer hours) so you can edit settings without leaving the app open for hours.
- **Canonical schedule** lives in Supabase `guest_lock_policy_state` (all devices / sessions). Cookie is a mirror + Edge fallback. Apply `supabase/guest-lock-policy.sql` once in prod.

---

## Problem

Today Argus / Trading sessions last **7 days** (`mt-auth` / `argus-auth` cookies). On a guest PC that is too long: leave the browser open (or walk away) and anyone can keep using the unlocked session.

Need a **Settings-controlled** mode that:

1. Can be **turned on/off**
2. Uses a **user-defined duration** (hours / schedule)
3. **Requires credentials again** when the window ends
4. Supports **date range** (from → to) **or indefinite** until turned off
5. Optionally respects **time-of-day hours** (work window)

---

## What exists today (code map)

| Piece | Path | Behavior |
|-------|------|----------|
| Session cookies | `lib/auth/cookies.ts` | Trading + Argus login: **7d**; private PIN: **1h**; delete unlock: **5m** |
| Middleware gate | `middleware.ts` | Redirects to login if password env set and cookie missing |
| Passwords | `lib/auth/passwords.ts` | `MATRIXTRADE_PASSWORD`, `ARGUS_PASSWORD`, `ARGUS_PRIVATE_PIN` |
| Login actions | `app/auth/actions.ts` | Sets cookies; logout clears all |
| Private lock UX | `app/argus/components/PrivateLockMenu.tsx` | Manual lock + 1h unlock — **closest UX to emulate** |
| Delete sudo window | `md/argus/inbox-delete-auth.md` | Short TTL after strong auth — pattern to emulate for “re-auth” |
| Trading settings | `/settings/capital`, `/system` | Capital + System only — **no session-security settings yet** |
| Argus settings page | — | **None** (PIN lives in top bar) |

**No** idle auto-lock, **no** guest mode, **no** configurable session TTL in UI today.

---

## Patterns to emulate (do not reinvent)

### 1. ARGUS private unlock (in-repo)

- Strong credential once → short-lived cookie → manual lock available  
- Files: `PrivateLockMenu`, `setArgusPrivateUnlock`, `ARGUS_PRIVATE` cookie  
- Emulate: **lock screen / re-prompt**, not a second password system

### 2. Inbox delete “sudo window” (in-repo)

- Documented in `md/argus/inbox-delete-auth.md`  
- Industry analogy: GitHub sudo mode, bank confirm transfer  
- Emulate: **explicit TTL** after auth; expire → must unlock again

### 3. OS / product analogues (external inspiration only)

| Analogue | Useful idea | Do **not** copy blindly |
|----------|-------------|-------------------------|
| Windows / macOS guest account | Separate limited profile | We stay same user + same data; only **session length** changes |
| Screen Time / parental schedule | Date range + daily hours | Keep schedule **client+server config**, not OS hooks |
| Banking “remember device 30 days” vs session | Opt-in long session vs short | Guest mode = **force short** (or schedule-bound) session |
| Chrome guest profile | Isolation | Out of scope — browser choice of the human |

**Recommendation:** Emulate **private unlock + delete TTL** already in MatrixTrade, plus a **Settings schedule** like Screen Time (active window), **not** a separate guest user/database.

---

## Proposed product name

**Guest workstation lock** (Settings)  
Alt labels for UI copy review: “Shared computer mode”, “Session timer”, “Auto re-lock”.

Prefer **Guest workstation lock** — clear that it is for borrowed PCs.

---

## Proposed behavior (for AI review)

### A. Master switch (Settings)

- **Off** (default): current 7-day cookies unchanged  
- **On**: Guest workstation lock active for this browser/profile according to schedule below

### B. Duration modes (user picks one)

| Mode | Meaning | When credentials required again |
|------|---------|--------------------------------|
| **Timer (X hours)** | From moment of login / enable | After X hours (user-defined, e.g. 1–12) |
| **Date range** | Active only from date D1 00:00 → D2 23:59 (tz?) | Outside range → treat as locked; inside range still respect timer or daily hours |
| **Indefinite until notice** | Mode stays on until user turns Off in Settings | Still uses **Timer** or **Daily hours** for each unlock; “indefinite” = policy stays enabled, not “never re-auth” |

Clarify for reviewers:

> “Indefinite until further notice” = **policy remains enabled** (do not auto-disable), **not** “session never expires”. Sessions still re-auth on timer/hours.

### C. Daily hours (optional sub-setting)

- e.g. Active only **09:00–18:00** local time while policy is On  
- Outside hours → require login again (or block until next window)

### D. Scope

| Option | Recommendation |
|--------|----------------|
| Argus only | Possible first slice |
| Trading only | Possible |
| **Both modules** | Preferred — one Settings surface, applies to `mt-auth` + `argus-auth` |

Private PIN cookie (`argus-private`) should **also clear** when guest lock fires (same as logout hygiene).

### E. Where Settings live

**Proposal (review):**

1. New route **`/settings/security`** (Trading preview shell) — Guest workstation lock panel  
2. Argus: link from v2 Help / Diagnostics **or** top-bar overflow → same settings page (shared)  
3. Do **not** bury only under Capital Settings

Fail-open reminder: if `MATRIXTRADE_PASSWORD` / `ARGUS_PASSWORD` unset, middleware already skips auth — Guest lock **cannot secure** an unpassworded deploy. Settings should show a warning when passwords are not configured.

---

## Technical approach (draft — not approved)

### Storage of policy

| Store | Pros | Cons |
|-------|------|------|
| **httpOnly cookie + signed payload** for “guest policy active + expiresAt” | Works without DB; server-readable in middleware | Harder multi-device sync |
| **localStorage only** | Easy UI | **Insecure** — user can edit; reject for enforcement |
| **Supabase / server prefs** | Cross-device | Needs schema + auth; heavier |

**Recommendation for v1:** Persist policy in an **httpOnly cookie** (or split: prefs cookie + short session cookie) set only via server actions after password confirm. Middleware reads expiry and clears/rejects session when past due.

Optional later: sync prefs to Supabase for multi-browser.

### Session TTL interaction

When Guest lock is **On**:

- On successful login, set `mt-auth` / `argus-auth` `maxAge` to **min(configured hours, remaining schedule window)** instead of 7 days  
- Client **countdown banner** (optional) + server enforcement in middleware (required)  
- On expiry: clear cookies → redirect to login  

When **Off**: keep today’s 7-day behavior.

### Emulate PrivateLockMenu UX

- Banner: “Guest workstation lock — session ends at HH:MM”  
- Button: **Lock now** (immediate clear + login)  
- Settings: edit hours / dates / indefinite policy (require current password to change)

---

## Non-goals (v1)

- Separate guest user / separate database  
- OS-level lock screen  
- Remote wipe  
- Per-route ACLs beyond existing private PIN / delete gates  
- Replacing `ARGUS_PRIVATE_PIN`  

---

## Open questions for AI + human review

1. **Timezone:** browser local vs fixed (e.g. America/Santiago)?  
2. **Default hours** when enabling (2h? 4h?)?  
3. **Trading + Argus** same policy or independent toggles?  
4. Should **idle timeout** (N minutes without interaction) be v1 or v2? User asked for clock/hours + date range — idle is extra.  
5. Must changing Settings require re-entering password? (Recommended: **yes**.)  
6. Warning copy when env passwords unset (fail-open)?  

---

## Suggested implementation slices (after approval only)

| Slice | Deliverable |
|-------|-------------|
| **0** | This handoff reviewed / annotated |
| **1** | Settings UI stub + policy model (no enforcement) |
| **2** | Cookie TTL + middleware enforcement + Lock now |
| **3** | Date range + daily hours |
| **4** | Countdown banner + Argus entry points |

---

## Test plan (when implementing)

- [ ] Guest Off → 7-day session unchanged  
- [ ] Guest On + 1h timer → after 1h middleware forces login  
- [ ] Lock now → immediate login wall  
- [ ] Date range outside window → locked  
- [ ] Indefinite policy + 2h timer → policy stays on after logout; each login still 2h  
- [ ] Password unset → Settings shows cannot secure warning  
- [ ] Private + delete cookies cleared on guest lock expiry  

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-08-05 | Handoff written; **no code** until AI + human verify |
| 2026-08-05 | v1 shipped: `/settings/security`, cookie policy, middleware window + timer, login TTL |

---

## Related docs

- `md/argus/inbox-delete-auth.md` — short re-auth window  
- `md/integrations/vercel-argus-production-handoff.md` — fail-open auth model  
- `lib/auth/cookies.ts` — current TTLs  
- `app/argus/components/PrivateLockMenu.tsx` — lock UX to emulate  
