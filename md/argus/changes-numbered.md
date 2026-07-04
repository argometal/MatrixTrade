# ARGUS numbered changes

Use git tags to restore any point.

| Change | Tag | Description |
|--------|-----|-------------|
| **99** | `change-99` | Unified **+** Add menu — capture note plus Person, Organization, Project, Topic, Event |
| **100** | `change-100` | Activity sort toggle, sign-out top-right, **+** centered in bottom nav |
| **101** | `change-101` | Capture + create unified on **right**; global capture sheet from **+** on any page |
| **102** | `change-102` | Compact floating bottom dock — grouped tabs, **+** centered, lifted above screen edge |

## Restore

```bash
# Back to change 99
git checkout change-99

# Back to change 100 (latest)
git checkout change-100

# Hard reset main to change 99 (destructive)
git reset --hard change-99
git push --force origin main   # only if you intend to revert production
```

## Deploy

Push `main` after tagging:

```bash
git push origin main --tags
```
