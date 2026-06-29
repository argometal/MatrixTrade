# Inconsistency Detection

## What
The app flags trades whose frontmatter is readable but logically incomplete.

## Rules
- `status: closed` without `exit` → `inconsistent: true`
- No auto-fix, no file rewrite
- UI shows a warning; P/L excludes missing exit

## Why
Manual edits in Obsidian can desync fields. Detection without mutation keeps notes trustworthy.
