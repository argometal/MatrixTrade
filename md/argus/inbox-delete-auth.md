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
| **Delete (unlinked)** | Soft-delete item + attachments | Deletion code + 5‑min window |
| **Delete (linked to topic/event/org)** | Same | Authenticator (TOTP) + 5‑min window |

---

## Delete unlock window (implemented)

Pattern: **GitHub sudo mode**, banking “confirm transfer”, iOS Screen Time — one strong auth, short window.

1. **Unlinked** — user taps **Unlock delete (5 min)** → enters `ARGUS_DELETE_CODE` (or `ARGUS_PRIVATE_PIN` fallback)
2. **Linked to topic, event, or organization** — user taps **Unlock with authenticator** → enters 6-digit TOTP from `ARGUS_TOTP_SECRET`
3. Server sets httpOnly cookie — **TTL 5 minutes** (`argus-delete` or `argus-delete-auth`)
4. Delete button enabled; each delete still shows confirm dialog
5. Window expires → must unlock again

**Separate from private unlock** (`argus-private`, 1 hour):

| Cookie | Purpose | TTL |
|--------|---------|-----|
| `argus-private` | View protected emails/logs | 1 h |
| `argus-delete` | Delete unlinked evidence (deletion code) | 5 min |
| `argus-delete-auth` | Delete linked evidence (authenticator) | 5 min |

**Is 5 minutes fair?** Yes — long enough to triage several emails, short enough to limit accidental or unattended deletion. Industry range: 2–15 min; 5 min is a good default.

---

## UI placement (v2)

| Surface | Behavior |
|---------|----------|
| Inbox → Links tab → Actions | Done (archive), Convert, **Delete** / Unlock delete |
| Legacy inbox / Home card | Same `deleteInboxAction` gate |
| Bulk select | Archive, assign topic, delete — same delete window |

---

## Server gates

- `deleteInboxAction` / `bulkDeleteInboxAction` — `assertDeleteAllowed()` when delete auth configured
- Dev without `ARGUS_DELETE_CODE` or `ARGUS_TOTP_SECRET` — delete allowed with confirm only (local iteration)
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
| Delete cookies | `lib/auth/cookies.ts` — `ARGUS_DELETE`, `ARGUS_DELETE_AUTH` |
| TOTP verify | `lib/auth/totp.ts` — `verifyArgusTotp`, `ARGUS_TOTP_SECRET` |
| Deletion code | `lib/auth/passwords.ts` — `verifyDeletionCode`, `ARGUS_DELETE_CODE` |
| Link gate | `lib/argus/delete-gate.ts` — `linkedEntityIdsRequireAuthenticator` |
| Unlock actions | `app/auth/actions.ts` — `unlockArgusDeleteAction`, `unlockArgusDeleteAuthAction` |
| Delete gate | `app/argus/actions.ts` — `deleteInboxAction`, `bulkDeleteInboxAction`, `deleteLogAction` |
| Inbox UI | `app/argus/v2/inbox/components/V2InboxDeleteControl.tsx` |
| Soft delete | `lib/argus/server-storage.ts` — `deleteInboxItem` |
