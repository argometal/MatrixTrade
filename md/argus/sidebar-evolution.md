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

## Phase B (shipped — 070903)

| Change | Detail |
|--------|--------|
| Home default | Intelligence view (no `?view=` param) |
| Entities tab | Replaced with **Browse** quick-links to dedicated browsers |
| Pulse strip | Action-only — inbox, follow-ups, classification (matches sidebar signals) |
| Home copy | *"Activity, intelligence, and what needs attention"* |
| Timeline | Stays on Home; removed legacy `/argus/journal` links |
| `?view=entities` | Still works → maps to Browse tab (backward compatible) |

---

## Phase C (optional)

- Hover-expand collapsed sidebar (desktop)
- Recent entities in expanded sidebar (`localStorage`)
- Knowledge map stays on Home only
