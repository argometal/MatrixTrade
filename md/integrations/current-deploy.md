# Current deploy

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


Production: https://matrix-trade-theta.vercel.app

Pinned revision: `main0917b`

Ship commit: `568b110` (Production live — verify https://matrix-trade-theta.vercel.app/api/build)

Includes:
- PR #374 — Network N1–N3 (conversation outcome, give↔receive matrix, leverage smart view) + vocabulary homogenization
- Prior `main0917a` / #371–#373: Event/Topic Tag universe search + sealed pending inventory
- Prior `rescue-12d-ui` / `d5aa448`: Control Apply rescue UI tip
- Prior `main0815o` / #359: Event Note Add ↔ Tags tab dual-write

**Terminology:** In ArgusForge docs, **MTA** = matrix/time engine (`argusforge-contract.md` §10). Trading product = **MatrixTrade**. See [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md).

IA handoffs: [`../argusforge/IA-HANDOFF.md`](../argusforge/IA-HANDOFF.md) · [`../argus/consolidated-product-direction.md`](../argus/consolidated-product-direction.md)

Sync:
```bash
git fetch origin --tags
git checkout main
git reset --hard origin/main
```
