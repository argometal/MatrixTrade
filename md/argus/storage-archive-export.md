# Storage growth, archive, and human exports

**Status:** Product guidance (2026-07-21)  
**Related:** Diagnostics A13 · Deliver packages · [`timeline-chronicle-model.md`](timeline-chronicle-model.md)

---

## What the Diagnostics panel shows

| Store | Role | Typical free-tier pressure |
|-------|------|----------------------------|
| **Supabase database** (~500 MB shown) | Entities, notes/logs, inbox metadata/bodies, links | Grows with email text + notes |
| **Supabase storage `argus-files`** | Binary attachments | Separate quota (files/photos) |
| **Vercel** | Stateless compute | Not a data store |

Local disk on Vercel is **not** authoritative. Cold survival = Supabase (and whatever you export off-platform).

The DB meter is **estimated from row payloads** (indexes/overhead not included). Treat ~70–80% as a soft planning line, not a cliff.

---

## When the database fills — what happens

Without action: inserts/updates start failing; ARGUS cannot grow new evidence. Attachments may still fit in the files bucket while DB text is full (or the reverse).

**Product rule:** never leave the user with only a computer dump. Archive must be **readable by a human** years later without ARGUS.

---

## What you can do today (no new UI required)

Use **Deliver** on an org / project / topic / event / person:

| Package | Human result | Regenerable? |
|---------|--------------|--------------|
| **Quick PDF** | Printable scan of activity | Yes, from live data |
| **Full dossier (ZIP)** | HTML report + original files under `files/` | Yes; keep the ZIP offline |
| **Evidence vault** | Same idea: files + manifest hashes | Yes |

Prefer **dossier ZIP** for cold storage: open the HTML in any browser; open PDFs/images with normal apps.

Emails today export as **readable text inside the HTML report**, not always as `.eml` message files. Attachments export as **original binaries** (PDF stays PDF, photo stays image) — that part already matches “human before computerized.”

---

## Recommended archive workflow (simple)

1. **Choose a closed scope** — e.g. finished project or quiet topic.  
2. **Full dossier** → download ZIP to disk / drive / another cloud folder.  
3. **Spot-check** — open report HTML; open 1–2 attachments.  
4. **Only then** soft-delete or archive entities in ARGUS (when lifecycle tools allow), so the DB sheds payload you no longer need online.  
5. Keep the ZIP as the **source of truth for cold history**; ARGUS stays the working set.

Do **not** depend on Vercel or a JSON API dump as the only copy.

---

## Desired next exports (product backlog — not built yet)

Ordered for human usefulness:

1. **Email as email** — `.eml` (or `.mbox`) per message so Outlook/Apple Mail can re-open threads.  
2. **One-click “Archive & download”** on a scope — dossier ZIP + optional mark-as-archived.  
3. **Cold shelf** — second Supabase project / S3 / external drive policy documented in Diagnostics (“Export before purge”).  
4. **Quota warnings** in A13 when DB estimate crosses ~70%.

Principle: **PDF as PDF, photo as photo, email as email, notes as readable text** — formats a person can open without ARGUS.

---

## What not to do

- Dump only opaque DB SQL or proprietary blobs as the archive.  
- Delete from ARGUS before a verified human package exists.  
- Assume Regenerable forever if the only copy is the live DB.
