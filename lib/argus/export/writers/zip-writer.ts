import { ZipArchive } from "archiver";
import { PassThrough } from "stream";
import type { VaultZipEntry } from "../types";

export async function buildVaultZipBuffer(entries: VaultZipEntry[]): Promise<Buffer> {
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  const done = new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    archive.on("error", reject);
  });

  archive.pipe(stream);

  for (const entry of entries) {
    archive.append(entry.content, { name: entry.path });
  }

  await archive.finalize();
  return done;
}
