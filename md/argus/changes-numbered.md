# ARGUS numbered changes

Use git tags to restore any point.

**Checklist rule:** Every numbered change that touches `/argus/v2` UI must update [`v2-design-checklist.md`](v2-design-checklist.md) in the same commit — see [`checklist-protocol.md`](checklist-protocol.md).

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
| **116** | `change-116` | v2 Home side-by-side panels, org/project mockup layouts, legacy journal link to v2 |
| **124** | — | v2 inbox entity linking (multi-select link modal) |
| **125** | — | Fix v2 sidebar overlap on inbox / browse layouts |
| **126** | `change-126` | Enlarge inbox link modal; fix scroll overlap |
| **127** | `change-127` | Move **+ Link** to email header |
| **128** | `change-128` | v2 Projects Browser portfolio cards |
| **129** | `change-129` | v2 Organization Browser portfolio cards |
| **130** | — | v2 Network Browser (relationship intelligence cards) — checklist § Network browser |
| **132** | `second-origin` | v2 checkpoint: Network browser, AI Charter, checklist v1.1, inbox unlink fix, search/PIN/filters |
| **138** | — | Desktop Create & Link 4-column mockup (`ArgusCreateLinkWindow`) |
| **139** | `source-3` | Mobile Create & Link step wizard; correlation guide + QA checklists; recovery tag `source-3` |
| **140** | `change-140` | Topic tag aliases (`linkedTags` on topics); ranked inbox suggestions via topic signals; inbox **Process** tab; filter chip labels; project rename/delete on v2 browse; inbox email → unified Create/Link (`inbox-evidence` mode) |
| **141** | `change-141` | Home timeline hover preview + click-through navigation; frequency-sized tag cloud (journal + inbox tags) |
| **142** | `change-142` | CREATE flow simplification — hamburger item menu, top-bar-only entry, Create Tag, lighter inline creates elsewhere |
| **143** | `change-143` | Unified **Link** modal (`ArgusLinkModal`) across ARGUS — inbox-style tabs incl. **Tags**; top **Create** stays full workspace; inline + New via `ReferenceCreateModal` |

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
