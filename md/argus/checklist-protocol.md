# ARGUS — Checklist protocol

**Status:** Mandatory for all v2 UI work  
**Canonical checklist:** [`v2-design-checklist.md`](v2-design-checklist.md)

Every ARGUS v2 design change must update the checklist **in the same PR / commit** as the code — not after.

---

## When to update

| Change type | Checklist action |
|-------------|------------------|
| **New screen or component** | Add section + unchecked items; add row to *Checklist maintenance log* |
| **Redesign / layout change** | Bump **Design version**; reset affected `[x]` → `[ ]`; note in version history |
| **Wire placeholder → real feature** | Move item from *Known gaps* to main section; check when verified |
| **New known gap / deferral** | Add to *Known gaps* table with `[~]` in main section if listed there |
| **User verifies in QA** | User marks `[x]`; optional sign-off row |

---

## Update steps (builder / AI)

1. Open [`v2-design-checklist.md`](v2-design-checklist.md).
2. Find the section for the route you changed (or add one using the template at the bottom).
3. Add or revise bullet items so each **testable behavior** has its own checkbox.
4. Update **Last updated** date at the top.
5. Add a row to **Checklist maintenance log** (change number, date, what changed).
6. If redesign: increment **Design version** (e.g. 1.0 → 1.1) and document in **Version history**.
7. Update [`changes-numbered.md`](changes-numbered.md) if the work is a numbered change.
8. Do **not** mark items `[x]` unless the user confirmed verification (builder marks `[~]` for partial).

---

## File → checklist map

Use this to know which section to edit when code changes:

| Code path | Checklist section |
|-----------|-------------------|
| `app/argus/v2/layout.tsx` | Global shell |
| `app/argus/v2/components/V2Sidebar.tsx` | Global shell → Sidebar |
| `app/argus/v2/components/V2TopBar.tsx` | Global shell → Top bar |
| `app/argus/v2/page.tsx` | Home preview |
| `app/argus/v2/browse/organizations/**` | Organizations browser |
| `app/argus/v2/organizations/[id]/page.tsx` | Organization detail |
| `app/argus/v2/browse/projects/**` | Projects browser |
| `app/argus/v2/projects/[id]/page.tsx` | Project detail |
| `app/argus/v2/browse/network/**` | Network browser |
| `app/argus/v2/inbox/**` | Inbox v2 |
| `app/argus/v2/browse/topics/**` | Topics browser |
| `app/argus/v2/browse/events/**` | Events browser |
| `lib/argus/v2/*-browse-utils.ts` | Matching browser section (data rules) |
| `lib/argus/v2/hierarchy.ts` | Cross-cutting → Data rules |

---

## Checkbox legend

```markdown
- [ ]  Not verified / not implemented
- [c]  Coded & build-verified — pending user QA
- [x]  Verified by user (QA pass)
- [~]  Placeholder or partial — also list in Known gaps
```

Builders mark `[c]` after implementation; only the user upgrades `[c]` → `[x]`.

---

## Sign-off

A design version is **accepted** only when:

1. All non-placeholder items in scope are `[x]`, and  
2. *Known gaps* accurately lists everything deferred, and  
3. Sign-off table at the bottom of [`v2-design-checklist.md`](v2-design-checklist.md) is filled.

Redesign → new version → sign-off resets for affected areas.

---

## Related docs

| Doc | Role |
|-----|------|
| [`v2-design-checklist.md`](v2-design-checklist.md) | Living QA checklist |
| [`changes-numbered.md`](changes-numbered.md) | Numbered change log |
| [`design-matrix-stage.md`](design-matrix-stage.md) | Locked lenses and routes |
| [`ai-charter.md`](ai-charter.md) | Evidence and neutrality rules |
