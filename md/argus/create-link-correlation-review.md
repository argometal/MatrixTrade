# ARGUS Create & Link — Correlation Review Checklist

**Purpose:** After implementing or testing Create & Link, verify what was created and what links to what.  
**Use with:** [`correlation-guide.md`](correlation-guide.md) · [`create-link-mobile-checklist.md`](create-link-mobile-checklist.md)

Fill this in during QA (example row included).

---

## Session metadata

| Field | Value |
|-------|-------|
| Date | |
| Surface tested | Desktop / Mobile |
| Environment | Local / Production |
| Recovery tag if rolled back | `source-3` |

---

## Items created this session

| # | Type | Name / Title | ID (if known) | Created via |
|---|------|--------------|---------------|-------------|
| 1 | Journal Note | e.g. Rig Move – Noble → Liza | | Create & Link step 3 |
| 2 | Topic | e.g. Rig Operations | | Create missing step 5 |
| 3 | Topic | e.g. Logistics | | Create missing step 5 |
| | | | | |

---

## Links established

| From (source) | Link type | To (target) | Verified on target view? |
|---------------|-----------|-------------|--------------------------|
| Journal #1 | Person | John Smith | [ ] `/argus/network/[id]` |
| Journal #1 | Organization | ExxonMobil Guyana | [ ] org detail timeline |
| Journal #1 | Project | Liza Phase 1 Drilling | [ ] `/argus/v2/projects/[id]` |
| Journal #1 | Event | BOP Test | [ ] events browse |
| Journal #1 | Topic | Rig Operations | [ ] topics browse |
| Journal #1 | Topic | Logistics | [ ] topics browse |

---

## Graph check (golden rule)

- [ ] Journal entry is **not isolated** — at least one link exists
- [ ] Each link appears on the **target entity’s** journal/evidence list
- [ ] Topics created inline are **linked automatically** (not orphan entities)
- [ ] Email was **not** duplicated into journal body (if email involved)
- [ ] User never left Create & Link flow until success screen

---

## View-from-anywhere (mockup step 10)

| Lens | URL | Journal #1 visible? |
|------|-----|---------------------|
| Project | `/argus/v2/projects/[projectId]` | [ ] |
| Person | `/argus/network/[personId]` | [ ] |
| Organization | `/argus/v2/organizations/[orgId]` | [ ] |
| Topic | `/argus/v2/browse/topics` | [ ] |
| Home recent | `/argus/v2` | [ ] |

---

## Issues found

```text
(notes)
```

---

## Sign-off

| Role | OK? | Date |
|------|-----|------|
| User visual QA | [ ] | |
| Link persistence | [ ] | |
| Mobile wizard complete | [ ] | |
