# Network intelligence thesis

**Status:** Design base — evidence from dozens of real networking conversations (human + AI synthesis).  
**Rule:** Network in Argus is **not a CRM**. It is a **distributed intelligence engine** that promotes contact first, evaluation later.

---

## Thesis

Networking is not asking for help.

It is becoming a source of value and building **distributed intelligence**.

Work arrives as a consequence — not as the objective.

---

## Pillars

### 1. Generate trust

Not fake friendship. Be consistent. Show up again. Do what you say.

### 2. Help genuinely

The highest-value conversations happened when you:

- connected people
- shared an opportunity
- offered a perspective
- listened

Not when you talked about yourself.

### 3. Learn

Each person lives a different reality. Questions are not curiosity — they build a **map of the world**.

### 4. Detect patterns

One conversation is weak signal. Twenty independent conversations are the statistical engine.

---

## Questions that work

Do not open with “How are you?” — that stays superficial.

| Question | Why it works |
|----------|----------------|
| What are you working on now? | Anchors in present reality |
| How do you see your industry in 3–5 years? | Shifts from job to trajectory |
| What is changing? | Surfaces friction and motion |
| What worries you? | Reveals pressure points |
| Where do you see opportunities? | Opens forward-looking dialogue |
| If you started today, what would you do differently? | Exposes regret and insight |
| What skill will matter most? | Maps capability bets |
| What problem is nobody seeing yet? | Finds edge intelligence |

**Strongest finding:** Most people talk about their job. Few talk about trends. Future-oriented questions change the conversation completely.

---

## Hidden objective

Not: get a job. Not: sell. Not: ask favors.

**Build a network that learns with you.** Each conversation adds a puzzle piece.

Unexpected repeat: helping others surfaced more answers for you than only thinking about your own problems.

---

## What each conversation should capture

Partial answers are fine. After contact, evidence should move toward:

| Lens | Question |
|------|----------|
| Their view | What is this person seeing? |
| Problems | What problem do they detect? |
| Opportunities | What opportunity do they see? |
| Skills | What capability do they consider important? |
| Connections | Who should know whom? |
| Your contribution | What can I offer? |

At that point networking stops being a contact list and becomes a **knowledge network**.

---

## Contact page flow (product)

Not spontaneous — **technique with respect**, like customer care. Systematized enough to repeat; human enough to stay real.

```text
[Person added]
      │
      ▼
┌─────────────────┐
│  Before contact │  Dialogue guide: pillars, questions, CTAs
│  (no evidence)  │  Register · Email · Log touch
└────────┬────────┘
         │ first email / record / meaningful touch
         ▼
┌─────────────────┐
│  After contact  │  Relationship overview (value exchange)
│  (has evidence) │  Timeline · patterns · attention
└────────┬────────┘
         │ N conversations
         ▼
┌─────────────────┐
│  Intelligence   │  Cross-person patterns, industry map
└─────────────────┘
```

### UI rules

1. **Before contact** — Overview shows dialogue guide only. No Contact Value / My Value / Attention panels.
2. **After contact** — Relationship overview unlocks. Derived from evidence + optional manual outcomes.
3. **Register** — Primary action; capture what you learned using the question lenses.
4. **Evaluation is post-hoc** — You do not score someone before you have spoken.

---

## Implementation status

| Piece | Status |
|-------|--------|
| Thesis doc | This file |
| Contact page: dialogue-first | Shipped in `NetworkDialogueGuide` |
| Relationship overview gated | After `timeline.length > 0` |
| Pattern engine across network | Future — observation engine |
| Question prompts in Register | Future — prefill tags / template |

---

## Related docs

- [network-browse-spec.md](network-browse-spec.md) — browse cards and strength
- [observation-engine-vision.md](observation-engine-vision.md) — cross-conversation patterns
- [ai-charter.md](ai-charter.md) — metrics serve attention, not vanity
