# Alexandria Legacy — audit checklist (does not block B0)

**Status:** Checklist — inspect later  
**Repo:** https://github.com/argometal/Alexandria  
**Related:** [`legacy-alexandria-adapter-boundary.md`](legacy-alexandria-adapter-boundary.md)

Do not invent adapter mapping before these are inspected.

- [ ] Library Build persistence format  
- [ ] Entity keys and `open_key` behavior  
- [ ] ORM schema and versions  
- [ ] Realm logic  
- [ ] Parcour construction and session records  
- [ ] Castle active/good calculations  
- [ ] Viewer inputs  
- [ ] Polling / bridge files  
- [ ] Godot interchange  
- [ ] Gatekeeper boundaries  
- [ ] Image / collage asset conventions  
- [ ] Scheduler / session JSONL formats  
- [ ] Stable identifiers already used  

**Rule:** B0 ships without waiting for this audit. Completed AF capabilities are tested through the thin Legacy Adapter **after** audit.
