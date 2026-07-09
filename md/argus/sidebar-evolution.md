# ARGUS — Sidebar Evolution

**Status:** Phase A shipped (070902)  
**Principle:** Sidebar navigates · Home intelligence · Browsers retrieve

---

## Phase A (shipped)

| Change | Detail |
|--------|--------|
| Default collapsed | `72px` (`4.5rem`); preference in `localStorage` `argus-v2-sidebar-collapsed` |
| Action-only signals | `buildV2NavCounts` → inbox pending, network follow-ups due, topics unclassified |
| No entity totals | Orgs/Projects/Events browse items show no inventory counts |
| Nav cleanup | Removed People duplicate, Follow-ups, Tags, Export `NEW`, footer status |
| Unified Network | Single `/browse/network` entry |
| Sections | Main · Browse · System (Deliver + Diagnostics) |
| Mobile drawer | Same `buildV2NavSections` — parity with desktop |

### Signal rules

| Item | Signal when |
|------|-------------|
| Inbox | Pending + linked inbox awaiting triage |
| Network | Follow-ups due today or overdue |
| Topics | Logs with `needs_classification` |

---

## Phase B (pending)

- Home default `?view=intelligence` — stop entity browser duplication
- Pulse strip action-only (align with sidebar signals)
- Remove `#follow-ups` / `#tags` anchor dependency from old sidebar links

---

## Phase C (optional)

- Hover-expand collapsed sidebar (desktop)
- Recent entities in expanded sidebar (`localStorage`)
- Knowledge map stays on Home only
