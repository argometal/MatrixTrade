# How Argus works

**UI guide:** `/argus/v2/help`  
**Canonical product identity:** [`evidence-organization-vision.md`](evidence-organization-vision.md)

---

## Core flow

```text
Receive → Register → Link → Retrieve → Deliver
```

| Verb | Meaning |
|------|---------|
| **Register** | Record what happened (short evidence entry) |
| **Link** | Connect evidence to people, projects, orgs, topics, events |
| **Add context** | Create a new graph lens (entity), then link evidence |
| **Retrieve** | Browse, search, entity pages — daily work |
| **Deliver** | Package evidence for handoff |

---

## Entity types

- **Organization** — institutional context (years)
- **Project** — bounded engagement
- **Person / Network** — relationship context
- **Event** — case anchor (occurrence)
- **Topic** — knowledge binder (subject across years)
- **Runbook** — execution procedure with steps

---

## Inbox triage

| Tab | Meaning |
|-----|---------|
| New | Unlinked / pending triage |
| Linked | Entity links exist; may still need register or topics |
| Done | Processed — excluded from alert counts |

Alert badges (sidebar, top bar) count only active triage: new + linked inbox, follow-ups due within 3 days (or overdue up to 30 days), and register entries without entity or topic classification.

---

## Deliver formats

| Format | Use when |
|--------|----------|
| **Activity Summary** | Quick read — highlights and recent timeline |
| **Evidence Dossier** | Full defensible archive — emails, entries, attachments |

---

## Tags & patterns

- **Topics** group evidence; **tags** mark individual evidence items at triage or register time.
- Tag picker suggests the top **10** frequent tags; the home tag cloud shows **20**.
- A **pattern** appears when the same tag recurs on ≥ **3** evidence items in scope, with at least one in the last **90 days**. Singletons are stored but not alerted.
- Topics and entities are never flagged as a whole — only recurring tagged evidence surfaces as small badges.

Full rules: [`tag-patterns-vision.md`](tag-patterns-vision.md).

---

## Entity lifecycle

- **Rename** — fix names without losing links or history.
- **Archive** — `lifecycleStatus: archived` hides from metrics and default browse; evidence remains for Deliver.
- **Projects** — default evidence view respects start/end dates; toggle **All dates** on the project page.
- **Organizations & org-linked topics** — no date expiry; archive when the subject is retired.

Full rules: [`entity-lifecycle-vision.md`](entity-lifecycle-vision.md).

---

## Browse views

See the in-app help at `/argus/v2/help` for Organizations, Projects, Network, Topics, and Events browse copy.
