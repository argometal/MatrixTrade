# ARGUS Correlation Guide

**Version:** 1.0  
**Status:** Accepted — rule of construction for linking and creation flows

## Objective

ARGUS is an evidence-centered professional knowledge system.

Everything revolves around one principle:

**Capture once. Link everywhere. Retrieve from any perspective.**

The goal is never to duplicate information. The goal is to connect it.

---

## Core objects

Six primary entities:

| Entity | Role |
|--------|------|
| **Journal** | Source of professional evidence |
| **Person** | Individual professional relationship |
| **Organization** | Institution / long-term relationship |
| **Project** | Bounded engagement (start → end) |
| **Topic** | Knowledge subject (not time-bound) |
| **Event** | Moment in time (meeting, failure, rig move, …) |

Everything else (Documents, Emails) references one or more of these.

---

## Journal

**Purpose:** Source of truth for professional evidence. Every observation begins here.

A journal entry may be a **Note** or a **Log**. A Note may later become a Log.

**Linkable to:** Person, Organization, Project, Topic, Event, Documents, Emails.

**Example:** Daily handover → Project → Organization → Person → Topic → Event. One journal, multiple links, visible from every lens.

---

## Person

**Purpose:** Professional relationship, career history, evidence, recognition.

**Links to:** Projects, Organizations, Topics, Events, Journal, Emails, Documents.

---

## Organization

**Purpose:** Long-term institutional memory. Timeline measured in years.

**Contains:** Projects, People, Topics, Events, Journal, Emails, Documents.

---

## Project

**Purpose:** Bounded work with start, end, objective, outcome.

**Timeline:** Limited to project dates. Evidence via contacts within date range.

**Links to:** People, Organizations, Topics, Events, Journal, Emails, Documents.

---

## Topic

**Purpose:** Knowledge — not time. Examples: RSS, MPD, Steering, Rig Move.

**Survives projects.** Many projects may reference the same topic with different evidence.

---

## Event

**Purpose:** A moment — meeting, failure, rig move, audit. Has date/time.

**Never contains knowledge** — groups evidence around one occurrence.

---

## Document & Email

- **Document:** PDF, image, spreadsheet — links to everything.
- **Email:** Immutable evidence. Journal holds interpretation; email stays original.

---

## Linking principle

Every entity exposes **Link Existing** and **Create Missing**.

If search fails → Create Topic (or Person, etc.) → Auto-link → Continue. User never leaves the workflow.

---

## Creation workflow (UI)

1. Create object  
2. Assign context (link)  
3. Search links  
4. Create missing links  
5. Save  

**One flow. Never several dialogs.**

---

## Golden rule

Nothing should exist isolated. Everything should either **link** or **offer to create and link**.

The user thinks: *"I am creating knowledge."* ARGUS decides where it belongs in the graph.

---

## UI implementation map

| Surface | Route / component | Guide alignment |
|---------|-------------------|-----------------|
| Create & Link (desktop) | `ArgusCreateLinkWindow` — 4 columns | Steps 1–5 in one screen |
| Create & Link (mobile) | `ArgusCreateLinkMobile` — step wizard | Mockup steps 2–9 |
| Home | `/argus/v2` | What needs attention today |
| Organization view | `/argus/v2/organizations/[id]` | Institutional lens |
| Project view | `/argus/v2/projects/[id]` | Bounded engagement lens |
| Person view | `/argus/network/[id]` | Professional lens |
| Topic / Event browse | `/argus/v2/browse/topics`, `events` | Knowledge / moment lenses |

See [`create-link-mobile-checklist.md`](create-link-mobile-checklist.md) and [`create-link-correlation-review.md`](create-link-correlation-review.md) for QA.
