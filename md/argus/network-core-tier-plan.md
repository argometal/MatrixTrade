# Network Core tier — logic plan (ON HOLD)

**Status:** Plan only · no schema/UI ship yet  
**Related:** [`network-intelligence-thesis.md`](network-intelligence-thesis.md) · [`network-intelligence.ts`](../../lib/argus/network-intelligence.ts)  
**Source CRM:** `Touch Base Tracker1(AutoRecovered).xlsx` (user GTD folder)

---

## User intent

- **Core** = personal circle (family, etc.) — must stay in rotation **even when Contact Value = 0**
- **Frequent** / **General** deferred — only Core for v1
- **Do not redesign Network UI** — one flag, existing cards/tabs stay
- **Do not invent recurrence** — override existing engines with a tier flag

### Naming (future tiers, not built)

| Touch Base Tracker sheet | User tier | Suggested label |
|--------------------------|-----------|-----------------|
| Routine Regulars | Core | **Core** |
| Occasional Acquaintances | Frequent | **Occasional** (matches Excel) |
| Potential Prospects | General | **Peripheral** or **Radar** |

---

## Touch Base Tracker → Argus field map (import ON HOLD)

| Excel column | Argus today | Notes |
|--------------|-------------|-------|
| Name | `Entity.name` | ✓ |
| Company / Company Name | linked org entity | ✓ |
| Email, Phone, Website, Social | `Entity.notes` | parse or manual |
| Job title | `Entity.alias` or notes line | partial |
| Where We Met | notes / `linkedTags` | — |
| Notes / Notes From Conversation | logs + notes | evidence |
| Follow Up Date | `Log.followUpDate` / `kind: follow_up` | ✓ engine exists |
| Done | — | on hold (completion flag) |
| Category (Routine / Occasional / Prospect) | **`networkTier`** (planned) | Core only v1 |

Excel color bands (Red/Yellow/Green = days until follow-up) map to **existing** `daysSinceLastInteraction` + grace — no new UI needed.

---

## Who we steal logic from (do not rewrite)

### 1. Primary — `lib/argus/network-intelligence.ts`

| Function | What it does | Core override |
|----------|--------------|---------------|
| `contactValueWeight(entity)` | Maps contactValue checkboxes → strategic 1–5 | If `networkTier === "core"` → treat as **5** (or fixed grace) |
| `GRACE_DAYS` | 30–120 day windows by value | Core uses **shorter fixed window** (e.g. 21–30d — tune with user) |
| `computeRelationshipHealth()` | active / cooling / dormant / neglected | Core never lands **neglected** while tier active |
| `computeAttentionScore()` | Home / lens ranking | Core gets floor score so they surface in pulse |
| `buildEntityIntelligence()` | Single entry point | Inject tier before health/score |

**This is the CRM recurrence engine.** Core is a **tier override** inside this file, not a parallel system.

### 2. Secondary — `lib/argus/network-relationship-metrics.ts`

| Function | Role |
|----------|------|
| `deriveRelationshipAttention()` | Contact profile Attention panel |
| `openFollowUps` / `nextFollowUp` from intel | `follow_up_pending` reason |

**Override:** if Core + `daysSinceLastInteraction > coreGrace` → force `needs_attention` (even with zero contact value).

### 3. Tertiary — follow-up persistence

| Piece | Role |
|-------|------|
| `recordNetworkLastContactAction()` | Calendar on browse card → `follow_up` log "Last contact" |
| `Log.kind === "follow_up"` + `followUpDate` | Touch Base “Follow Up Date” column |
| `loaders.ts` home follow-ups | Due/overdue queue |

Core contacts **reuse** last-contact + follow_up — no new log type.

### 4. Browse status — `lib/argus/v2/network-browse-utils.ts`

| Function | Role |
|----------|------|
| `deriveNetworkStatus()` | Active / Dormant / New / Lost chips |

**Override:** Core + past grace → stay **Active** (or new tone “Core due”) without changing layout — optional badge via `linkedTags` or small chip text only.

---

## Minimal schema (when un-hold)

```ts
// Entity (person only)
networkTier?: "core" | null;  // v1: only "core"
// optional later: "occasional" | "peripheral"
```

Persist in `server-storage` / Supabase entity row — **not** notes hacks.

**UI (minimal):** one checkbox on person edit / contact edit — “Core contact” — no browse layout change.

---

## Implementation steps (when approved)

1. Add `networkTier` to `Entity` + normalize + storage
2. `effectiveCadence(entity)` in `network-intelligence.ts` — Core branch
3. Wire override in `buildEntityIntelligence`, `deriveRelationshipAttention`, `deriveNetworkStatus`
4. Edit form: Core checkbox only
5. **Later:** Excel import script → map Routine Regulars → `networkTier: "core"`, map Follow Up Date → `follow_up` logs

---

## What we explicitly do NOT build

- New recurrence tables or CRM modules
- Frequent / Peripheral tiers until Core proves out
- Full Touch Base Tracker UI clone
- Replacing Contact Value / My Value panels

---

## Thesis fit

Core = **relationship obligation** decoupled from **exchange value**. Evidence engine unchanged; tier only changes **when silence becomes attention**.
