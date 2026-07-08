# ARGUS — Inbox Delete & Destructive Auth

**Status:** Canonical (process) — Phase 1 PIN gate implemented; TOTP roadmap below  
**Related:** [`observation-engine-vision.md`](observation-engine-vision.md) · Rule 0 soft-delete · `ARGUS_PRIVATE_PIN`

---

## Principle

ARGUS preserves evidence. **Archive** is the default “done” action. **Delete** is soft-delete (`deletedAt`) — recoverable in backups, not shown in UI — and requires deliberate auth when PIN is configured.

| Action | Effect | Auth |
|--------|--------|------|
| **Archive** | `status: archived` — out of active inbox | Session only |
| **Convert** | Journal log + `converted` | Session only |
| **Delete** | Soft-delete item + attachments | PIN + 5‑min delete window |

---

## Delete unlock window (implemented)

Pattern: **GitHub sudo mode**, banking “confirm transfer”, iOS Screen Time — one strong auth, short window.

1. User taps **Unlock delete (5 min)** → enters `ARGUS_PRIVATE_PIN`
2. Server sets httpOnly cookie `argus-delete` — **TTL 5 minutes**
3. Delete button enabled; each delete still shows confirm dialog
4. Window expires → must unlock again

**Separate from private unlock** (`argus-private`, 1 hour):

| Cookie | Purpose | TTL |
|--------|---------|-----|
| `argus-private` | View protected emails/logs | 1 h |
| `argus-delete` | Perform soft-delete | 5 min |

**Is 5 minutes fair?** Yes — long enough to triage several emails, short enough to limit accidental or unattended deletion. Industry range: 2–15 min; 5 min is a good default.

---

## UI placement (v2)

| Surface | Behavior |
|---------|----------|
| Inbox → Links tab → Actions | Done (archive), Convert, **Delete** / Unlock delete |
| Legacy inbox / Home card | Same `deleteInboxAction` gate |
| Bulk select | **Deferred** — same delete window when added |

---

## Server gates

- `deleteInboxAction` — requires `hasArgusDeleteUnlock()` when `argusPrivateConfigured()`
- Dev without `ARGUS_PRIVATE_PIN` — delete allowed with confirm only (local iteration)
- `clearAllSessions` clears delete cookie on logout

---

## Authenticator roadmap (TOTP)

Phases — do not block inbox delete on this:

| Phase | Scope |
|-------|-------|
| **A (now)** | PIN for private view + 5‑min delete window |
| **B** | TOTP (Google Authenticator / Authy) enrollment in Settings; store encrypted secret server-side |
| **C** | Destructive ops accept **PIN or TOTP**; delete window set by either |
| **D** | Optional: TOTP required for delete; PIN only for private view |
| **E** | Recovery codes + audit log of destructive actions |

Libraries: `otpauth` or `@levminer/otp` for TOTP verify; QR enrollment standard.

**Recommendation:** Keep PIN for “show sensitive” and add TOTP as upgrade for delete/export/clear-all — aligns with observation engine (evidence preservation, human judgment on destruction).

---

## What not to do

- Hard-delete inbox rows in production Supabase (Rule 0 / export backups)
- Delete without confirm even inside unlock window
- Merge delete unlock with private unlock (different risk profiles)

---

## Code map

| Piece | Location |
|-------|----------|
| Delete cookie | `lib/auth/cookies.ts` — `ARGUS_DELETE`, `hasArgusDeleteUnlock` |
| Unlock action | `app/auth/actions.ts` — `unlockArgusDeleteAction` |
| Delete gate | `app/argus/actions.ts` — `deleteInboxAction` |
| Inbox UI | `app/argus/v2/inbox/components/V2InboxDeleteControl.tsx` |
| Soft delete | `lib/argus/server-storage.ts` — `deleteInboxItem` |
