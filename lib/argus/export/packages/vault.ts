import { readAttachmentBytes } from "../../server-storage";
import { buildExportEvidencePayload, buildExportManifest, buildExportTimeline, sha256Hex } from "../manifest";
import type { CollectedVaultEvidence, VaultZipResult } from "../types";
import { buildVaultZipBuffer } from "../writers/zip-writer";

export async function buildEvidenceVaultZip(input: {
  collected: CollectedVaultEvidence;
  includePrivate: boolean;
  options?: import("../types").ExportCollectionOptions;
}): Promise<VaultZipResult> {
  const { collected, includePrivate, options } = input;
  const evidencePayload = buildExportEvidencePayload(collected);
  const timelinePayload = buildExportTimeline(collected);

  const evidenceJson = Buffer.from(JSON.stringify(evidencePayload, null, 2), "utf8");
  const timelineJson = Buffer.from(JSON.stringify(timelinePayload, null, 2), "utf8");
  const hashes: Record<string, string> = {
    "evidence.json": sha256Hex(evidenceJson),
    "timeline.json": sha256Hex(timelineJson),
  };

  const fileEntries: Array<{ path: string; content: Buffer }> = [];

  if (options?.includeAttachments !== false) {
    for (const attachment of collected.attachments) {
      const bytes = await readAttachmentBytes(attachment.id);
      if (!bytes) continue;
      const zipPath = `files/${attachment.id}`;
      fileEntries.push({ path: zipPath, content: bytes });
      hashes[zipPath] = sha256Hex(bytes);
    }
  }

  const manifest = buildExportManifest({
    collected: {
      ...collected,
      attachments: collected.attachments.filter((att) =>
        fileEntries.some((entry) => entry.path === `files/${att.id}`)
      ),
    },
    includePrivate,
    hashes,
    options,
  });
  const manifestJson = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");

  const buffer = await buildVaultZipBuffer([
    { path: "manifest.json", content: manifestJson },
    { path: "evidence.json", content: evidenceJson },
    { path: "timeline.json", content: timelineJson },
    ...fileEntries,
  ]);

  return { buffer, manifest };
}
