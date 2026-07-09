# MatrixTrade — Design Checklist Template

Copy this file when adding a **new screen, major section, or redesign**.

```markdown
# MatrixTrade — [Screen Name] Design Checklist

**Route:** `/your-route`
**Production:** https://matrix-trade-theta.vercel.app/your-route
**Last design version:** YYYY-MM-DD (commit `hash`)
**Component(s):** `ComponentName` · Data: `loadX()`
**Source files:** `path/to/component.tsx` · …

## Changelog

| Date | Commit | Change |
|------|--------|--------|
| YYYY-MM-DD | `hash` | Initial checklist |

---

## A. Shell & routing
- [ ] ...

## B. [Section name]
- [ ] ...

## C. Read-only / pipeline rules (if applicable)
- [ ] What must NOT happen on this screen

## D. Data freshness
- [ ] After [action], UI updates on refresh

## E. Responsive smoke test
- [ ] Mobile / tablet / desktop

## Sign-off
| Role | Name | Date | Notes |
|------|------|------|-------|
```

**Workflow**

1. Agent implements or redesigns UI.
2. Agent publishes a checklist in `md/design/[screen]-checklist.md`.
3. User checks each box in browser (production or local).
4. On redesign → reset checklist, bump version, re-verify all items.
