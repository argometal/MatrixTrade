# Current deploy

Production: https://matrix-trade-theta.vercel.app

Pinned revision: `main0814d`

Ship commit: `189beda`

Includes:
- Event delete with PIN lock (PR #276) — Inbox/Chronicle/entity delete no longer require TOTP when PIN is set; entityKind fallback; delete PIN also unlocks private session
- Prior: entity Back (PR #275), tag rename (PR #274), Topic runbook org edit (PR #272), neighbors Molecule A/B (PR #271)
