# Immutability and history

## Closed trades

Once `status: closed`:

- Do not change entry, exit, shares in frontmatter
- Do not reopen in the app
- Corrections → new note in `history/`, not overwrite

## Theses

When a thesis changes:

- Keep `companies/TICKER/thesis.md` as current view
- Optional: archive as `thesis-YYYY-MM-DD.md` before major edits
- Git commits provide audit trail for repo files

## History folder

`history/` is **append-only**:

```
history/2026-03-29-cycle-snapshot.txt
history/2026-03-29-export-to-chatgpt.txt
```

Use for snapshots sent to ChatGPT, cycle summaries, correction notes.

## Git

Every push to the private repo preserves document history.  
Trade files in `vault/Trades/` are local-only unless you explicitly change `.gitignore`.

## Why

> Losses and mistakes are data. Deleting them deletes learning.
