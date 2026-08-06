# 06 — Decision flow

**Constraint:** Describe the current decision pipeline as coded and documented. No redesign.

“Decision” here means **runtime gates, classification, and routing choices** present in the repository — not a separate Decision entity type (no such type in `types.ts`).

---

## Modules that participate

| Module | Role in decisions |
|--------|-------------------|
| `middleware.ts` | Route access / auth redirect / legacy redirect |
| `lib/auth/require-session.ts` | Session required for Argus pages/actions |
| `lib/auth/passwords.ts` | Password login; private PIN verify |
| `lib/auth/totp.ts` | TOTP for delete-auth |
| `lib/auth/cookies.ts` | Session / private unlock / delete unlock cookies |
| `lib/auth/guest-workstation-lock.ts` | Guest lock schedule / override |
| `lib/argus/data-safety/write-gate.ts` | Allow/block writes (`writeArgusSafe`) |
| `lib/argus/data-safety/policy.ts` | Destructive / ephemeral rules |
| `lib/argus/delete-gate.ts` | Soft-delete allowed? (code / authenticator) |
| `lib/argus/delete-link-check.ts` | Whether linked evidence requires authenticator |
| `lib/argus/private-access.ts` | Filter private records unless unlocked |
| `lib/argus/normalize.ts` | `resolveClassificationStatus` |
| `lib/argus/journal-helpers.ts` | Infer journal kind / dates |
| `lib/argus/journal-behavior.ts` | Allowed note↔log transitions |
| `lib/argus/link-hierarchy.ts` | Allowed link targets by source kind |
| `lib/argus/register-infer.ts` | Register kind/date hints |
| `lib/argus/v2/tag-patterns.ts` | Pattern threshold (≥3, freshness 90d) |
| `lib/argus/v2/topic-signals.ts` | Inbox suggestion ranking from aliases/name |
| `lib/argus/network-intelligence.ts` | Health / attention scores (derived) |
| `app/argus/actions.ts` | Applies gates then mutates via `server-storage` |

---

## Execution order (typical write)

```text
1. HTTP / Server Action entry
2. requireArgusSession() (most UI mutations)
3. Optional: guest lock / private unlock cookie checks (UI surfaces)
4. Parse FormData / JSON; validate ids/names
5. Domain-specific gates (examples below)
6. data-safety writeArgusSafe / write intent (destructive vs normal)
7. server-storage mutate ArgusData / inbox / files
8. revalidatePath / redirect
```

Exact order per action: see each function in `app/argus/actions.ts`. Full per-action order matrix: UNKNOWN without line-by-line expansion of all 73 exports.

---

## Classification decisions

| Decision | Mechanism | Source |
|----------|-----------|--------|
| Log `classificationStatus` | `classified` \| `needs_classification` | `types.ts`, `normalize.ts` `resolveClassificationStatus` |
| Journal `kind` | `log` \| `event` \| `follow_up` | `types.ts`; inference in `journal-helpers.ts` |
| Inbox `status` | `pending` \| `linked` \| `converted` \| `archived` | `types.ts`; transitions in inbox loaders/actions |
| Entity display kind | `referenceKindFromNotes` / `entityTypeToReferenceKind` | `reference-types.ts` |
| Reference create kind | `REFERENCE_KINDS` only | `reference-types.ts` |
| Link allowed? | `filterLinkIdsForSource` / `link-hierarchy.ts` | `link-hierarchy.ts` |

Constitution accepted direction (document only; “Server rules and UI remain unchanged until explicitly scheduled”): Journal may be saved without Entity if marked Needs Classification (`argus-architecture.md`). Runtime enforcement status vs that direction: PARTIALLY IMPLEMENTED / UNKNOWN — `ClassificationStatus` exists in types; whether all create paths enforce “at least one entity” unchanged: UNKNOWN without full action audit.

---

## Delete decision pipeline

```text
UI (V2EntityLifecycleActions / inbox delete)
  → optional delete unlock (PIN code cookie) OR authenticator unlock (TOTP cookie)
  → deleteEntityV2Action / inbox delete actions
      → assertEntityDeleteAllowed / assertDeleteAllowed (delete-gate.ts)
      → confirmName match
      → optional private PIN if private evidence and not unlocked
      → softDelete (deletedAt) via server-storage / inbox-store
```

| Gate error | Meaning (`delete-gate.ts`) |
|------------|----------------------------|
| `delete_code_locked` | Delete code configured and not unlocked |
| `delete_auth_locked` | Authenticator required and not unlocked |
| `totp_not_configured` | Authenticator required but TOTP secret missing |

`entityDeleteRequiresAuthenticator` / `linkedEntityIdsRequireAuthenticator` (`delete-link-check.ts`) decide authenticator vs code path.

---

## Private evidence decision pipeline

```text
Record.private === true
  → private-access filters hide unless hasArgusPrivateUnlock cookie
  → UI V2PrivateEvidenceGate
  → delete of private-linked entities may require PIN (actions)
```

---

## Pattern / metric decisions

| Decision | Rule | Source |
|----------|------|--------|
| Tag becomes Pattern | Same tag on ≥3 evidence items in scope AND ≥1 in last 90 days | `tag-limits.ts`, `tag-patterns.ts`, `tag-patterns-vision.md` |
| Entity Aliases/Signals count as Patterns? | No — only evidence `topics` arrays | `tag-patterns.ts` comment/behavior; `vocabulary-policy.md` |
| Topic browse metrics scope | Direct topic evidence | `topic-loaders.ts` |
| Intelligence topic volume | May include linked events | `intelligence-viz.ts` `countEvidenceForTopicIncludingEvents` |

---

## Write / storage decisions

| Decision | Module |
|----------|--------|
| Cloud journal vs local JSON | `journal-store` config `isCloudJournalStore()` |
| Cloud inbox vs local | `inbox-store` config `isCloudInboxStore()` |
| Block destructive write on ephemeral host | `data-safety/policy.ts`, `write-gate.ts` |
| Soft vs hard delete | Soft-delete preferred; hard delete deprecated/blocked after protection SQL |

---

## How decisions propagate

1. **Auth cookies** set by login / unlock actions → read by subsequent requests (middleware, layouts, actions).
2. **Entity/log fields** (`classificationStatus`, `status`, `lifecycleStatus`, `deletedAt`, `private`) persist in `ArgusData` / Supabase rows → loaders filter.
3. **Revalidation** after mutations refreshes RSC/pages.
4. **Derived metrics** (network intelligence, tag patterns) recomputed on read from stored evidence — not a separate decision store.

**Central decision engine / workflow orchestrator:** UNKNOWN (not present as a named module).
