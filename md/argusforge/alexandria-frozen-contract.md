# Alexandria — Frozen Repository Contract

**Status:** Canonical — **FROZEN** (repository / implementation scope)  
**Date:** 2026-07-23 · clarified 2026-07-25  
**Scope:** Binding rules for how MatrixTrade / ArgusForge treat the Alexandria **repository** until an explicit reopen.  
**Rule:** Do not implement changes in that repo. Do not redesign its current UI. Do not refactor it in place. Do not migrate that codebase into ArgusForge until reopen.

This contract remains active until explicitly replaced.

---

## 0. Clarification — freeze the repo, not the destination

**What is frozen:** the Alexandria **repository** (the historical product line that already found a working path — ~LibraryBuild + GateKeeper + ORM-16 era). That artifact is preserved; it is not the place for incremental “final product” UI work.

**What is not frozen forever:** the **architecture destination**. Integration that comes next evolves into a **new Alexandria** — not a forever-dead design sealed inside the old repo.

**Intended successor framing (product intent, not implementation authorization):**

```text
Alexandria (frozen repo)  =  proven path / reusable mechanics baseline
Argus                     =  Alexandria + 1
Alexandria (evolved)      =  I. Motor  inside Argus
```

- **Argus** is the next generation of that line (Alexandria +1).  
- Historical Alexandria does not stay a separate forever-product beside Argus; what is worth keeping becomes the **motor / engine** under Argus.  
- AF may continue Chaos, Vault, and Argus surfaces **without** depending on the frozen repo today.  
- Reopen still required before any code merge, API coupling, or “Alexandria motor” implementation in MatrixTrade.

This section clarifies destination. Sections below still bind **current** work: out of scope until reopen.

---

## 1. Status

The Alexandria **repository** is officially:

**FROZEN**

Frozen does not mean abandoned, and does **not** mean the architecture idea is dead.

Alexandria remains part of the long-term ecosystem. Its current interface is **not** the final product. The destination is evolution under Argus (Alexandria +1), with Alexandria as motor — see §0.

No incremental UI evolution **inside the frozen repo** should be treated as the path toward that destination.

---

## 2. Long-term identity

Alexandria (as capability / motor line) is the **spatial–structural knowledge engine** that Argus will host as **I. Motor** after reopen and redesign.

That line’s purpose remains:

- spatial representation of knowledge;
- 3D memory palaces;
- rapid construction of Parcours;
- rapid transformation of information into navigable knowledge;
- visual and spatial analysis of relationships;
- human traversal of structured knowledge.

It is **not** merely a viewer, note application, or list-based knowledge manager.

The frozen repo proved a path; the **new Alexandria** (under Argus) requires technology study and architectural redesign — not polish of the frozen UI.

---

## 3. Gatekeeper

Gatekeeper is **not** Alexandria as a whole.

Gatekeeper is only the **traversal experience**.

Its purpose is navigation and access to knowledge experiences.

Do not expand Gatekeeper into:

- the complete authoring system;
- the full 3D engine;
- the complete knowledge-management product;
- the replacement for Alexandria.

Gatekeeper may evolve later, but only as part of the future Alexandria redesign.

---

## 4. What must be preserved

Preserve the current repository and all potentially reusable work, including:

- Alexandria mechanics;
- Locus model;
- Parcour model;
- Object model;
- Warp relationships;
- review and evaluation mechanics;
- scheduling logic;
- segmentation logic;
- generation of child structures;
- Gatekeeper code;
- existing data structures;
- reusable engine code;
- documented architectural decisions.

Preservation does **not** imply that every current implementation will survive unchanged.

The future redesign must decide what is reused, adapted, or replaced.

---

## 5. What must not happen now

Do not:

- redesign the Alexandria interface;
- polish the current UI as if it were final;
- add large new UI features;
- force Alexandria into ArgusForge;
- create a superficial ArgusForge integration;
- rebuild the 3D environment now;
- choose a future rendering technology without a dedicated study;
- rewrite the repository preemptively;
- delete legacy mechanics or code;
- assume the current engine is the final engine.

---

## 6. ArgusForge boundary

Until reopen, ArgusForge must treat the Alexandria **repository** as a **frozen external product**.

At this stage, ArgusForge may only acknowledge the destination: Chaos/Library material → evolved Alexandria as **motor under Argus** (Alexandria +1). Prep and research notes may sketch exchange; they do not authorize coupling.

No **binding** implementation contract should be forced yet beyond the future need for an **exchange / motor boundary**.

Do not ship detailed Alexandria packages, schemas, adapters, or APIs in product code until the Alexandria repository and technologies are studied and reopen is authorized.

**ArgusForge must not depend on the frozen Alexandria repo today.**  
**The frozen Alexandria repo must not block ArgusForge development.**

---

## 7. Reopening conditions

Alexandria may be reopened only when a dedicated architecture phase begins.

That phase must include:

1. Review of the complete Alexandria repository.
2. Inventory of reusable mechanics and code.
3. Study of suitable 3D technologies and engines.
4. Evaluation of desktop, mobile, web, VR, and spatial-computing constraints.
5. Redesign of the authoring experience.
6. Redesign of the Parcour and memory-palace construction workflow.
7. Definition of the relationship: **Argus = Alexandria +1**; evolved Alexandria as **I. Motor** of Argus; exchange / ownership boundaries after study.
8. Migration or reuse plan from the frozen repo into that motor (what is reused, adapted, or replaced).
9. Explicit decision on what survives from the current implementation.

No technology stack for the new motor should be locked before this study. Destination framing (§0) is allowed; premature engine selection is not.

---

## 8. Current development rule

For all current work:

**Alexandria is out of implementation scope.**

When the repository is encountered:

- preserve it;
- document relevant dependencies;
- identify possible future integration points;
- do not modify it unless explicitly authorized.

If any current task appears to require changing Alexandria, **stop and report the dependency** before proceeding.

---

## 9. Official interpretation

Alexandria is a valid concept whose ambition exceeded the frozen repo’s current interface and engine — and that repo already marked a workable path.

The correct response is not incremental patching of the frozen UI.

The correct response is **preserve the repo, freeze implementation there, study, then reconstruct** as the **new Alexandria motor inside Argus** (Alexandria +1).

This contract remains active until explicitly replaced.

---

## Related

| Document | Role |
|----------|------|
| [phase-0-architecture.md](phase-0-architecture.md) | Canonical AF Phase 0 — must respect this freeze |
| [chaos-to-library-alexandria-pipeline.md](chaos-to-library-alexandria-pipeline.md) | Non-binding Chaos → Library → Argus/motor pipeline research |
| [alexandria-spatial-bottleneck-research.md](alexandria-spatial-bottleneck-research.md) | Deferred non-binding research — not AF architecture |
| [README.md](README.md) | ArgusForge library index |
