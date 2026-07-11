# Network — Argus of the future

**Status:** Design base — architectural split (2026-07-11).  
**Complements:** [evidence-organization-vision.md](evidence-organization-vision.md) (past) · [network-intelligence-thesis.md](network-intelligence-thesis.md) (technique)

---

## One sentence

**Argus organizes the past. Network orients the future.**

---

## The split

| | **Argus (evidence)** | **Network (relations)** |
|---|---------------------|-------------------------|
| **Time** | What happened | What may happen |
| **Mood** | Register, prove, retrieve | Talk, explore, build |
| **Objects** | Inbox, records, files, deliver | People, dialogue, prospects, co-creation |
| **Question** | What did we capture? | What are we creating together? |

Argus is not wrong for network — **past evidence feeds future context**. But the network surface must not feel like a case file or pain log.

---

## What network is NOT

- Not “this person hurt me”
- Not “this happened to us” (litigation / grievance frame)
- Not a CRM pipeline with stages and pressure
- Not scoring people before you speak

---

## What network IS

Per person:

- **Conversations** — what we’re discussing (register when fresh)
- **Prospects** — ideas, opportunities, trends they see (forward-looking)
- **Co-creation** — projects, topics, intros we’re building **together**

The unit of value is not the contact card. It is the **shared forward motion**.

---

## Architecture (same engine, different lens)

```text
                    ┌─────────────────────────────────┐
                    │         Shared engine           │
                    │  entities · links · tags · logs │
                    └───────────────┬─────────────────┘
                                    │
              ┌─────────────────────┴─────────────────────┐
              ▼                                           ▼
   ┌──────────────────────┐                 ┌──────────────────────┐
   │  ARGUS — past lens   │                 │ NETWORK — future lens  │
   │  Inbox · Timeline    │                 │ Browse · Contact     │
   │  Deliver · Focus     │                 │ Playbook · Prospects │
   │  “What happened?”    │                 │ “What’s next?”       │
   └──────────────────────┘                 └──────────────────────┘
              │                                           │
              └─────────────────┬─────────────────────────┘
                                ▼
                    Evidence unlocks context
                    Dialogue creates new evidence
```

**Same data.** Different default question.

---

## How entities relate (network frame)

| Link | Future meaning |
|------|----------------|
| **Person → Project** | We are building this together |
| **Person → Topic** | Shared subject / industry prospect |
| **Person → Event** | Anchor for a case or meeting ahead |
| **Person → Organization** | Institutional context for the relationship |
| **Register (after talk)** | Conversation + prospect captured → becomes evidence |

Projects and topics are not archive folders in network view — they are **vehicles of co-creation**.

---

## Contact page phases (aligned)

```text
1. No evidence yet     → Playbook + dialogue (future)
2. First conversation  → Register + linked prospects
3. Ongoing             → Projects/topics + relationship overview (optional grades)
4. Argus elsewhere     → Full past evidence, deliver, timeline
```

Relationship overview (Contact Value / My Value) stays **post-contact** — it evaluates exchange over time, not first impression.

---

## Copy and UX rules

1. Network browse: “Who are we moving forward with?” not “Who do we have history with?”
2. Strength / status: derived from evidence, but label as **momentum** not judgment
3. Primary CTA on contact: **Register conversation** / Email — not Export, not Evaluate
4. Timeline on contact: supporting context, not the hero
5. Intelligence home: map of **active knowledge**; network: map of **active relationships**

---

## Implementation today vs direction

| Today | Direction |
|-------|-----------|
| Browse cards show last interaction | Emphasize linked projects + open prospects |
| Contact overview gated on evidence | ✓ |
| Playbook cheat sheet | ✓ |
| “Prospects” as first-class UI | Light — topics/projects on contact; no new entity type yet |
| Separate network DB | **No** — lens on same engine |

No new data model required for v1. Reframe UI and copy toward **future co-creation**.

---

## Related

- [network-intelligence-thesis.md](network-intelligence-thesis.md) — how to talk
- [network-browse-spec.md](network-browse-spec.md) — browse cards
- [knowledge-execution-model.md](knowledge-execution-model.md) — entity ontology
