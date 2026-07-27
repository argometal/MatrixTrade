# CHANGE 24-2E — Chaos Dumping image ingestion

**Status:** Implemented  
**Route:** `/forge/chaos`  
**Scope:** Chaos Dumping only — not Argus Treemap/graph, Vault, Alexandria, MTA, Apply, Capital, Learning, nav.

## Goal

Accept text, one or more images, or both in a single capture via picker, clipboard paste, and drag/drop. Preserve the existing Dumping save/open/move/undo flow.

## Architecture preserved

- AF03 repo state in `localStorage` (metadata only).
- Reuses **24-1C** IndexedDB store: DB `argusforge-chaos-assets-v1`, store `assets` (`lib/argusforge/af03-chaos-assets-idb.ts`).
- Content kinds already include `text` | `link` | `image` | `mixed` — no new kind.
- Images referenced as **image blocks** + `assets[]` metadata (not a new `imageAssetIds` field).
- No Argus / MTA / Apply changes.

## Capture validity

Valid if non-empty text **or** ≥1 valid image (or both). Image-only needs no placeholder text.

## Ingest surfaces

| Surface | Behavior |
|---------|----------|
| **Add image** | `<input type="file" accept="image/*" multiple>` — appends; resets value after pick |
| **Paste** | Clipboard `image/*` files appended; native text paste preserved |
| **Drag/drop** | Material container drop target; hover “Drop images into Chaos”; non-images rejected with compact error |
| **Fullscreen** | Same shared draft (text + images + errors) |

## Limits

```
MAX_IMAGE_COUNT = 10
MAX_IMAGE_BYTES = 15 * 1024 * 1024
```

MIME must start with `image/`. No silent compression.

## Save transaction

1. Validate  
2. Persist blobs to IndexedDB  
3. Stable asset IDs  
4. Create fragment + text/image blocks + asset metas  
5. Confirm → then clear draft  

On failure: no success toast; keep text + previews; orphan blobs cleaned when safe.

## Undo

Removes fragment, exclusive asset metas, and IDB blobs; restores text and re-hydrates draft images when blobs are readable.

## Viewer

`ContentViewer` resolves image blocks via IndexedDB; missing assets show **Image unavailable**.

## Known limitations

- Node/CI cannot exercise real IndexedDB writes (tests assert unavailable → no false success).
- iOS clipboard image paste depends on browser support.
- Shared assets referenced by another fragment are not deleted on undo.
- No crop/reorder/filters/AI classification.
- Argus image behavior unchanged.

## Tests

`npm run test:chaos-dump-images`
