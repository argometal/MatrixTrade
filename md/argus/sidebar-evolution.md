# ARGUS — Sidebar Evolution

**Status:** Phase C shipped (070904)  
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
| Inbox | Pending + linked inbox awaiting triage (excludes converted / done) |
| Network | Follow-ups due within 3 days or overdue up to 30 days |
| Topics | Register entries without entity links or topic tags |

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

## Phase C (shipped — 070904)

| Change | Detail |
|--------|--------|
| Hover-expand | Collapsed sidebar expands on hover (desktop); overlays content, does not shift layout |
| Recent entities | Last 6 visited entities in expanded sidebar; `localStorage` `argus-v2-recent-entities` |
| Recorder | `V2RecordRecentEntity` on org, project, topic, event, contact, runbook detail views |
| Knowledge map | Stays on Home only (unchanged) |
