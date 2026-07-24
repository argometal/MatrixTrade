# Chaos capture typography (research note)

**Purpose:** Raw ingest surface — not brand design, not Alexandria.

## What we had
- `window.prompt` for text body → tiny, unusable for long dump
- Content editor: mono `text-sm` + markdown structure toolbar (H1/H2…) — fights “ingesta”

## Target UX
Word-like dump window: wide (`max-w-3xl`), full-height textarea, optional title, no decorative headings.

## Evidence-backed defaults (market + research)

| Setting | Choice | Why |
|--------|--------|-----|
| Font | **Lexend** | Tuned for reading fluency / reduced crowding (Shaver-Troup line); free Google Font |
| Size | **18px** | Rello et al. CHI 2016 — larger sizes (18+) improved comprehension vs 10–14 on text-heavy web |
| Line height | **~1.55** | Common guidance 1.5–1.6 (Material / Baymard / USWDS longer text) |
| Measure | **Wide for dump** | Reading optima often cite ~50–75ch; capture prioritizes dump space over editorial measure |
| Alt fonts (later) | Atkinson Hyperlegible, Literata | Accessibility clarity / ebook long-form — optional, not required for v1 |

## Explicit non-goals
- Fancy display type, marketing hero typography
- Markdown structure toolbar on capture
- Classification during dump

## Implementation
`ChaosCaptureSurface` — full-viewport dialog from Chaos Deck “Add text”.
