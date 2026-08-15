# Prompt 15-12 — MTA Control language / ontology cleanup

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
