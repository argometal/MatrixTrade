# Network AI snapshot + JSON import (pilot)

**Status:** Pilot — Network browse + contact pages only  
**Pattern:** Matrix Trade scouting desk (snapshot copy + human Apply JSON import)

---

## Flow

1. **Snapshot** — User copies text from Network header (`SnapshotButton`): ARGUS charter brief + network state + `=== REQUEST ===` block types.
2. **External AI** — User pastes snapshot into ChatGPT or similar; AI returns one JSON block.
3. **Import** — User pastes JSON in `NetworkAiImportPanel` → Validate → Preview → **Apply**.
4. **Apply** — Server action writes via existing Argus storage (`createLog`, `updateEntity`). No silent mutations.

---

## Scopes

| Scope | Page | Content |
|-------|------|---------|
| `network-desk` | `/argus/v2/browse/network` | Summary counts, status breakdown, recent interactions, due/dormant highlights |
| `network-person` | `/argus/v2/network/[id]` | Entity, org, role, tags; dialogue guide (no contact evidence) OR relationship overview + timeline snippet |

Both scopes prepend `buildArgusNetworkBrief()` and append `NETWORK_AI_BLOCK_REQUEST`.

---

## Block types

| Type | Effect |
|------|--------|
| `network-register` | Append `log` journal entry linked to person |
| `network-follow-up` | Append `follow_up` log with `followUpDate` |
| `network-tags` | Merge `linkedTags` on person entity |
| `network-analysis` | Append note log only — no entity field mutation |
| `network-metrics` | Update `contactValue` / `myValue` arrays |

Required shape:

```json
{
  "type": "network-register",
  "proposal": {
    "entityId": "<person-id>",
    "title": "...",
    "body": "..."
  }
}
```

---

## Files map

| File | Role |
|------|------|
| `lib/argus/network-ai-brief.ts` | Charter primer for AI |
| `lib/argus/network-ai-snapshot.ts` | Scope builders + REQUEST append |
| `lib/argus/network-ai-block.ts` | Parse, validate, preview, samples |
| `lib/argus/apply-network-ai-block.ts` | Apply handlers (explicit call only) |
| `lib/argus/v2/network-snapshot-packages.ts` | `SnapshotMenuItem[]` for pages |
| `app/argus/v2/network/components/NetworkAiImportPanel.tsx` | Paste → validate → preview → Apply UI |
| `app/argus/actions.ts` | `importNetworkAiBlockAction` |
| `app/argus/v2/browse/network/page.tsx` | Desk snapshot items |
| `app/argus/v2/network/[id]/page.tsx` | Person snapshot items |
| `app/components/preview/SnapshotButton.tsx` | Reused copy-to-clipboard control |

---

## Constraints (pilot)

- Network only — not events, topics, or orgs
- Human Apply always
- Analysis blocks append logs only
- Not a CRM — no pipeline/deal semantics

---

## Related docs

- [`ai-charter.md`](ai-charter.md) — ARGUS AI behavior rules
- [`network-intelligence-thesis.md`](network-intelligence-thesis.md) — Past vs future, dialogue thesis
