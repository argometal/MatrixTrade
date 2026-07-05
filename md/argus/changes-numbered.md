# ARGUS numbered changes

Use git tags to restore any point.

| Change | Tag | Description |
|--------|-----|-------------|
| **99** | `change-99` | Unified **+** Add menu — capture note plus Person, Organization, Project, Topic, Event |
| **100** | `change-100` | Activity sort toggle, sign-out top-right, **+** centered in bottom nav |
| **101** | `change-101` | Capture + create unified on **right**; global capture sheet from **+** on any page |
| **102** | `change-102` | Compact floating bottom dock — grouped tabs, **+** centered, lifted above screen edge |
| **103** | `change-103` | Home inbox cards tap-to-link (no expand); actions visible on card face |
| **104** | `change-104` | Email action menus moved to top of card (Home + inbox detail) |
| **105** | `change-105` | Hierarchical entity linking with time rules (inbox, project, topic, event) |
| **106** | `change-106` | Fix Argus client crash — keep Add provider outside Suspense fallback |
| **107** | `change-107` | Add menu hints; inbox tap email to read, actions for link |
| **108** | `change-108` | Inbox link picker shows all reference types (not recent people only) |
| **109** | `change-109` | Fix project email counts (cloud inbox); improved email evidence viewer |
| **110** | `change-110` | People and events show linked email counts on Home and entity pages |
| **111** | `change-111` | Dual inbox links, project-scoped evidence, notes evolve to any reference |
| **112** | `change-112` | Protected emails and records hidden until PIN unlock |
| **113** | `change-113` | Rename Capture to Journal with Log vs Note entry types |
| **114-revert** | `change-114-revert` | **Emergency rollback point** — last commit before v2 UI (`aad2a3e`) |
| **114** | `change-114` | v2 design preview shells at `/argus/v2` (layout + mock structure) |
| **115** | `change-115` | Wire v2 to live data with org/project hierarchy rules + implementation report |

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
