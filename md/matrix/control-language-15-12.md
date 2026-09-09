# Prompt 15-12 — MTA Control language / ontology cleanup

## A-Iteration

User-defined rules are primary.
This Library MD is the source of A-Iteration Anchors for its scope.
A-Iteration Anchors preserve the user's exact words.
AI never rewrites or reinterprets them.
If conflict or ambiguity exists, AI must negotiate with the user.
Respect ontology. Do not invent.
Only present what canonically exists in the epistemology.
If the required epistemology does not exist, do not add it; stop and report it.
Never change a user-defined A-Iteration rule.
Preserve A-Iteration Anchors.
Preserve what works.
Change only what is necessary.
Do not fix what does not block.
Verify the result.


**Status:** Shipped in code (2026-08-15).  
**Code:** `lib/visible-snapshot-menu.ts`

## Problem

AI instructions described nav names and internal resources as if they were visible copy buttons (e.g. “copy Learning”, ambiguous “Apply schema contract” path). SNAPSHOT MENU lists diverged between Mechanics brief and full snapshot.

## Rules

1. UI label = exact visible text · Snapshot ID = internal · Protocol = paste body · Route = implementation  
2. Ask only for labels the human can find literally  
3. Single canonical SNAPSHOT MENU — no hand-duplicated lists  
4. No trading/schema/persistence logic changes  

## Report

See PR body / agent summary for term mapping and internal resources without dedicated copy paths.
