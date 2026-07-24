# Argus Home as Chaos Deck heat-graph — discussion brief

**Status:** Concept for discussion (not architecture, not implementation)  
**Audience:** Product owner ↔ ChatGPT / design critique  
**Date:** 2026-07-24  
**Related:** [`argus-graph-prototype.md`](argus-graph-prototype.md) · [`phase-0-architecture.md`](phase-0-architecture.md) · [`chaos-deck-fragment-naming.md`](chaos-deck-fragment-naming.md)

---

## Paste block for ChatGPT

```text
CONTEXT — ArgusForge (AF)

Products / engines (locked Phase 0):
- Chaos captures raw material.
- Chaos Deck = binder. Fragment = unit inside a deck. A Chaos Deck is full of fragments.
- Argus relates (semantic / structural graph).
- MTA observes time (usage, recurrence, attention, decay).
- Vault prepares formation. Alexandria (3D knowledge product) is FROZEN — do not reopen it here.
- Strict rule: Argus determines relationships. MTA determines temporal behavior.
  → Usage frequency must NOT become a semantic relation.

WHAT EXISTS TODAY
1) Chaos repo (browser local): folders, Chaos Decks, Fragments. Deck has contentCount, updatedAt.
2) /forge home = dashboard (stats, recent decks) — not a graph.
3) /forge/argus = Argus graph prototype (React Flow, 2D):
   - Nodes = units synced from Chaos Fragments (+ demo).
   - Edges = manual typed relations (supports, contradicts, related_to, …).
   - Groups, tags, evidence types, recurrence candidates, export JSON/MD.
   - Storage separate from Chaos source. No AI extraction. No unit ceiling.
4) No true “usage” telemetry yet — only createdAt / updatedAt as weak proxies.
5) No 3D renderer in AF. “3D graph” here means a spatial metaphor / future viz layer,
   not Alexandria Realm/Parcour.

PROPOSAL — Argus home becomes a content graph (deck scale)

Replace or complement the dashboard home with a living graph whose primary nodes are
Chaos Decks (not Fragments). Fragments remain the mass inside each deck and feed
the unit-level Argus Engine canvas at /forge/argus.

Visual encoding (heat-graph fusion):

| Channel     | Meaning                         | Source of truth          |
|-------------|----------------------------------|--------------------------|
| Node        | Chaos Deck                       | Chaos repo               |
| Size        | Volume of content (fragments)    | contentCount / body mass |
| Color/glow  | Use heat → bright = hot          | MTA-style attention      |
| Dim/decay   | Unused → decadent / cold         | same temporal signal     |
| Edges       | Relations between decks          | Argus (manual → Engine)  |
| Layout      | Force / orbit / mild 3D depth    | Presentation only        |

Interpretation:
- Big bright node  = large Chaos Deck you keep touching.
- Big dim node     = lots of fragments, neglected (attention debt).
- Small bright node = thin but alive.
- Small dim node   = almost dead weight.
- Edge            = “these decks are related” — NEVER inferred only from heat.

Optional 3rd axis (presentation, not ontology):
- z / depth = lifecycle (Active vs Archive), confirmation density, or folder cluster.
- Do not invent Alexandria objects. Depth is a camera metaphor for focus.

TWO SCALES (keep separate)
A) Home heat-graph — Chaos Deck nodes (overview of the forge).
B) Engine unit graph (/forge/argus) — Fragment/unit nodes + typed relations.

Home answers: “Where is my Chaos, and what is alive?”
Engine answers: “How do these units relate?”

OPEN QUESTIONS FOR DISCUSSION
1) Is Argus home this deck graph, or does Focus own heat and Argus owns only relations?
2) What is “used”? open deck, edit fragment, dwell time, prepare-for-Vault, link creation?
3) Decay curve: half-life days? Soft dim vs hard archive glow?
4) Size metric: fragment count only, or weighted by body length / kind?
5) Deck–deck edges: manual only at first? Aggregated from unit relations? Never from co-open?
6) 2.5D (React Flow + glow) vs real WebGL force graph — when is 3D worth the cost?
7) How does Archive appear — same plane dimmed, separate layer, or hidden by default?
8) Mobile: heat-graph as primary home, or list-first with graph as secondary?
9) Does clicking a node open the Chaos Deck, expand Fragments as satellites, or both?
10) Naming: “Argus home”, “Chaos map”, “Heat graph” — product label?

CONSTRAINTS / NON-GOALS
- Do not let brightness create or replace Argus edges.
- Do not implement spaced-repetition or Alexandria spatial AI.
- Do not mix MTA product objects into the AF Chaos Deck graph as peer nodes.
- Prototype may use updatedAt as fake heat until real access events exist.
- Keep Chaos as source of content; graph layers are views, not second stores of body text.

ASK
Critique this concept. Propose a minimal v0 encoding + instrumentation plan that
respects Argus≠MTA, and a path from today’s React Flow unit graph to a deck-scale
heat home without reopening Alexandria.
```

---

## Concept in one sentence

**Argus home = relational map of Chaos Decks, where size is how much Chaos lives inside and brightness is how alive that deck still is — heat on a graph, not a second notes list.**

---

## Why this fits what we already built

| Piece | Reuse |
|-------|--------|
| Chaos Deck + Fragment naming | Node = Deck; mass = Fragments |
| `contentCount` / items in deck | Size channel (exists) |
| `/forge/argus` unit graph | Keep as Engine drill-down; do not replace with home |
| Manual relations + typed edges | Pattern for deck–deck links later |
| Phase 0 Argus vs MTA split | Edges = Argus; heat/decay = temporal layer (even if UI paints both) |
| Home dashboard | Candidate surface to become the graph (or sit under Focus) |

---

## Heat ≠ relation (critical)

```text
Hot decks that are often opened together ≠ “related”.
Related decks that are cold ≠ “unrelated”.
```

Heat is **attention weather**.  
Edges are **structure**.  
Same canvas, two truths.

If ChatGPT suggests “auto-link decks that are used together,” treat that as a **suggestion candidate**, never an automatic Argus edge without human/engine confirmation (same spirit as recurrence candidates in the unit prototype).

---

## Suggested minimal v0 (if we build later)

1. **Nodes** = Active Chaos Decks (Archive filter toggle).
2. **Size** = `sqrt(fragmentCount)` (or log) so outliers don’t dominate.
3. **Heat** = recency of `deck.updatedAt` or max(fragment.updatedAt) — disclose as proxy.
4. **Edges** = none, or manual “related deck” only.
5. **Interaction** = click → open Chaos Deck; long-press / panel → stats.
6. **Tech** = stay 2D React Flow first; glow/opacity for heat; 3D only if navigation demands depth.

Instrumentation debt for real heat: `lastOpenedAt`, open counts, edit events — belongs to temporal/attention tracking (MTA responsibility in the sealed model), even if AF stores a local prototype signal.

---

## What this is not

- Not Alexandria 3D knowledge spaces.
- Not replacing Chaos capture UX.
- Not the definitive Argus Engine schema.
- Not auto-ontology from brightness.

---

## Index note

Add to [`README.md`](README.md) when this concept is accepted or rejected; until then it remains a discussion artifact.
