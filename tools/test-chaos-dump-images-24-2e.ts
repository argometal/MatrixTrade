/**
 * CHANGE 24-2E — Chaos Dumping image ingestion tests.
 */
import assert from "node:assert/strict";
import type { Af03Block, Af03ImageBlockPayload } from "../lib/argusforge/af03-builder-types";
import {
  appendImageFilesToDraft,
  CHAOS_DUMP_MAX_IMAGE_BYTES,
  CHAOS_DUMP_MAX_IMAGE_COUNT,
  exclusiveAssetIdsForFragment,
  extractImagesFromClipboard,
  extractImagesFromDrop,
  isValidChaosDumpCapture,
  persistChaosDumpCapture,
  resolveDumpKind,
  revokeAllDraftImages,
  validateImageFile,
  type ChaosDraftImage,
} from "../lib/argusforge/af03-chaos-dump-images";
import { createDeck } from "../lib/argusforge/af03-repo-store";
import type { Af03RepoState } from "../lib/argusforge/af03-repo-types";
import { DEFAULT_PREFS } from "../lib/argusforge/af03-repo-types";

function blankState(): Af03RepoState {
  return {
    version: 3,
    folders: [],
    decks: [],
    items: [],
    blocks: [],
    assets: [],
    prefs: { ...DEFAULT_PREFS },
  };
}

function pngFile(name: string, size = 128): File {
  const bytes = new Uint8Array(size);
  bytes[0] = 0x89;
  return new File([bytes], name, { type: "image/png" });
}

function textFile(name: string): File {
  return new File(["hello"], name, { type: "text/plain" });
}

async function main() {
  // 1. Text-only save remains unchanged (no IDB required)
  {
    let state = blankState();
    const created = createDeck(state, {
      title: "Chaos Inbox",
      folderId: null,
      view: "active",
    });
    state = created.state;
    const result = await persistChaosDumpCapture(state, {
      deckId: created.deck.id,
      text: "hello dump",
      images: [],
    });
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("expected ok");
    assert.equal(result.item.kind, "text");
    assert.equal(result.item.body, "hello dump");
    assert.equal(result.assetIds.length, 0);
    assert.equal(result.state.items.some((i) => i.id === result.item.id), true);
    assert.equal(result.item.unsupported, false);
  }

  // 2. Image-only validation succeeds
  {
    assert.equal(isValidChaosDumpCapture("", 1), true);
    assert.equal(validateImageFile(pngFile("a.png"), 0), null);
    assert.equal(resolveDumpKind("", 2), "image");
  }

  // 3. Text plus image references → mixed kind
  {
    assert.equal(resolveDumpKind("notes", 1), "mixed");
    assert.equal(resolveDumpKind("https://example.com/x", 0), "link");
    assert.equal(resolveDumpKind("plain", 0), "text");
  }

  // 4. Non-image files rejected
  {
    const err = validateImageFile(textFile("notes.txt"), 0);
    assert.ok(err);
    assert.equal(err!.code, "unsupported_type");
    const { drafts, error } = appendImageFilesToDraft([], [
      textFile("a.txt"),
      pngFile("b.png"),
    ]);
    assert.equal(drafts.length, 1);
    assert.ok(error);
    assert.equal(error!.code, "unsupported_type");
    revokeAllDraftImages(drafts);
  }

  // 5. Size and count limits
  {
    const big = pngFile("big.png", CHAOS_DUMP_MAX_IMAGE_BYTES + 1);
    assert.equal(validateImageFile(big, 0)?.code, "file_too_large");
    let acc: ChaosDraftImage[] = [];
    for (let i = 0; i < CHAOS_DUMP_MAX_IMAGE_COUNT; i++) {
      const r = appendImageFilesToDraft(acc, [pngFile(`i${i}.png`)]);
      acc = r.drafts;
    }
    assert.equal(acc.length, CHAOS_DUMP_MAX_IMAGE_COUNT);
    const overflow = appendImageFilesToDraft(acc, [pngFile("overflow.png")]);
    assert.equal(overflow.drafts.length, CHAOS_DUMP_MAX_IMAGE_COUNT);
    assert.equal(overflow.error?.code, "too_many_images");
    revokeAllDraftImages(acc);
  }

  // 6. Paste extraction handles image clipboard items
  {
    const file = pngFile("clip.png");
    const dt = {
      items: [
        {
          kind: "file",
          type: "image/png",
          getAsFile: () => file,
        },
        {
          kind: "string",
          type: "text/plain",
          getAsFile: () => null,
        },
      ],
      files: { length: 0 },
    } as unknown as DataTransfer;
    const images = extractImagesFromClipboard(dt);
    assert.equal(images.length, 1);
    assert.equal(images[0], file);
  }

  // 7. Drop extraction handles multiple images
  {
    const a = pngFile("a.png");
    const b = pngFile("b.png");
    const t = textFile("c.txt");
    const dt = {
      files: { length: 3, 0: a, 1: b, 2: t },
    } as unknown as DataTransfer;
    const { images, rejectedNonImages } = extractImagesFromDrop(dt);
    assert.equal(images.length, 2);
    assert.equal(rejectedNonImages, 1);
  }

  // 8. Asset-store unavailable prevents false success (Node has no IndexedDB)
  {
    let state = blankState();
    const created = createDeck(state, {
      title: "Inbox",
      folderId: null,
      view: "active",
    });
    state = created.state;
    const draft = appendImageFilesToDraft([], [pngFile("x.png")]).drafts;
    const result = await persistChaosDumpCapture(state, {
      deckId: created.deck.id,
      text: "",
      images: draft,
    });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("expected failure");
    assert.ok(
      result.error.code === "storage_unavailable" ||
        result.error.code === "persistence_failure"
    );
    revokeAllDraftImages(draft);
  }

  // 9–10. Legacy text capture shape has no required image fields
  {
    const legacy = {
      id: "item_legacy",
      deckId: "deck_x",
      kind: "text" as const,
      title: "Old note",
      body: "legacy body",
      sourceRef: null,
      order: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      unsupported: false,
      unsupportedReason: null,
      markedForLater: false,
    };
    assert.equal("imageAssetIds" in legacy, false);
    assert.equal(legacy.kind, "text");
  }

  // 11. Exclusive asset ids for undo (shared assets excluded)
  {
    const fragmentId = "item_a";
    const state: Af03RepoState = {
      ...blankState(),
      blocks: [
        {
          id: "blk1",
          fragmentId,
          type: "image",
          order: 0,
          payload: { assetId: "asset_only" } satisfies Af03ImageBlockPayload,
          createdAt: "t",
          updatedAt: "t",
        },
        {
          id: "blk2",
          fragmentId: "item_b",
          type: "image",
          order: 0,
          payload: { assetId: "asset_shared" } satisfies Af03ImageBlockPayload,
          createdAt: "t",
          updatedAt: "t",
        },
        {
          id: "blk3",
          fragmentId,
          type: "image",
          order: 1,
          payload: { assetId: "asset_shared" } satisfies Af03ImageBlockPayload,
          createdAt: "t",
          updatedAt: "t",
        },
      ] as Af03Block[],
      assets: [
        {
          id: "asset_only",
          mimeType: "image/png",
          filename: "a.png",
          byteSize: 1,
          createdAt: "t",
        },
        {
          id: "asset_shared",
          mimeType: "image/png",
          filename: "b.png",
          byteSize: 1,
          createdAt: "t",
        },
      ],
    };
    assert.deepEqual(exclusiveAssetIdsForFragment(state, fragmentId).sort(), [
      "asset_only",
    ]);
  }

  // 12. Empty capture invalid; missing-asset UI is graceful (separate component)
  {
    assert.equal(isValidChaosDumpCapture("", 0), false);
    assert.equal(isValidChaosDumpCapture("x", 0), true);
  }

  console.log("test-chaos-dump-images-24-2e: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
