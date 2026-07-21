# Storage growth, archive, and human exports

**Status:** Product guidance (2026-07-21)  
**Related:** Diagnostics A13 · Deliver · [`timeline-chronicle-model.md`](timeline-chronicle-model.md)

---

## What the Diagnostics panel shows

| Store | Role | Typical free-tier pressure |
|-------|------|----------------------------|
| **Supabase database** (~500 MB shown) | Entities, notes/logs, inbox metadata/bodies, links | Grows with email text + notes |
| **Supabase storage `argus-files`** | Binary attachments | Separate quota (files/photos) |
| **Vercel** | Stateless compute | Not a data store |

Local disk on Vercel is **not** authoritative. Cold survival = Supabase (and whatever you export off-platform).

Treat ~70–80% DB usage as a soft planning line.

---

## Portable Archive (primary cold copy)

Deliver package **`evidence_dossier`** — UI label **Portable Archive**.

Designed so a person can use it **without Argus**, with everyday tools:

| Path | Format | Open with |
|------|--------|-----------|
| `report.html` | HTML | Any browser |
| `emails/*.eml` | RFC 822 email | Outlook, Apple Mail, Thunderbird, Gmail import |
| `notes/*.md` | Markdown | Text editor, Obsidian, VS Code, Notion import |
| `attachments/*` | Original binaries | PDF readers, Photos, Office — **PDF stays PDF** |
| `files/{id}` | Same binaries (id keys) | Linked from `report.html` |
| `README.txt` | Plain text | Any editor |
| `argus/*.json` + `manifest.json` | Structured | Future Argus re-import / integrity |

**Principles:** human-first, industry-standard, not obscure. Prefer formats people already know over proprietary dumps.

### Workflow

1. Pick a closed scope (project / topic / org / person / event).  
2. Deliver → **Portable Archive** → download ZIP.  
3. Spot-check: open `report.html`, one `.eml`, one attachment.  
4. Store the ZIP offline (drive / another cloud).  
5. Only then soft-delete or archive live records if you need DB space.

Quick PDF remains a **scan** deliverable, not the cold archive.

---

## If Argus disappears

Keep the ZIP. You still have:

- A readable story (`report.html`)
- Real emails (`.eml`)
- Notes as Markdown
- Original files

No Argus runtime required.

---

## Backlog

- One-click “Archive & download” with optional mark-as-archived  
- A13 warning at ~70% DB estimate  
- Import tool that reads `argus/evidence.json` back into a live workspace
