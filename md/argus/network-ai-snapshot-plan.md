# Network AI snapshot + JSON import (pilot)

**Status:** Pilot — Network browse + contact pages  
**Pattern:** Network Mechanics orientation + natural-language chat + Library blocks on demand + human Apply

---

## Flow

1. **Network Mechanics** — User copies one consolidated orientation prompt (charter, record state, dialogue behavior, Library index, Apply contract, AI behavior).
2. **Chat** — Human writes the task naturally (“Review this contact”, “Create a person”). No copied Request prompt.
3. **Library** — AI asks for exact UI labels; user copies only those blocks.
4. **Apply** — User pastes JSON in Network Panel → Validate → **Apply** (human gate).

---

## Panel hierarchy

```
NETWORK PANEL
[ Network Mechanics ]   ← copy
[ Apply ]               ← paste JSON import
Library
  Contact / Desk / Rules / …
[ Close ]
```

---

## Scopes

| Scope | Page | Mechanics focus |
|-------|------|-----------------|
| `network-desk` | `/argus/v2/browse/network` | Desk; Library includes desk snapshot |
| `network-person` | `/argus/v2/network/[id]` | Person + CURRENT_RECORD_STATE; Library includes Contact |

Builders: `buildNetworkMechanicsPrompt`, `buildNetworkContactPanelPackage`, `buildNetworkBrowsePanelPackage` in `lib/argus/network-ai-mechanics.ts`.

Library index is derived from the same `NetworkContextBlockDef[]` that render Library rows — not a second hard-coded menu.

---

## Block types (Apply JSON — unchanged)

| Type | Effect |
|------|--------|
| `network-create-person` | Create person entity |
| `network-capture` | Conversation capture on existing person |
| `network-register` | Append journal log |
| `network-follow-up` | Follow-up log |
| `network-tags` | Merge tags |
| `network-analysis` | Note only |
| `network-metrics` | contactValue / myValue |

---

## Files map

| File | Role |
|------|------|
| `lib/argus/network-ai-brief.ts` | Charter primer (embedded in Mechanics) |
| `lib/argus/network-ai-mechanics.ts` | Mechanics / Library packages / record state / index |
| `lib/argus/network-ai-snapshot.ts` | Desk/person data slices + legacy full snapshot |
| `lib/argus/network-ai-block.ts` | Parse, validate, preview, samples |
| `lib/argus/network-dialogue.ts` | Dialogue pillars / flow (embedded summary in Mechanics) |
| `lib/argus/apply-network-ai-block.ts` | Apply handlers |
| `app/argus/v2/network/components/NetworkPanel.tsx` | UI hierarchy |

---

## Constraints

- Network only — not events, topics, or orgs
- Human Apply always — no AI API integration
- Analysis blocks append logs only
- Not a sales CRM — no pipeline/deal semantics

---

## Related docs

- [network-intelligence-thesis.md](network-intelligence-thesis.md)
- [ai-charter.md](ai-charter.md)
- Matrix parallel: [../matrix/snapshot-catalog.md](../matrix/snapshot-catalog.md)
